import template from './simple-leaflet-prompt.json';
import {equivalentPresentation} from './match-display';

export function simpleLeafletEnabled(){
 return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='experiment/claude-simple-leaflet'&&process.env.MEDICEA_CLAUDE_PREVIEW!=='false';
}
export const SIMPLE_LEAFLET_MODEL='claude-sonnet-5-5';
// The owner's Word prompt, including its repeated Indications line and spelling.
// These are the only substitutions. No application instructions are appended.
export function simpleLeafletPrompt(medicine:string,country:string){
 return template.replaceAll('CoEfferalgan',medicine).replaceAll('Italy',country);
}
export async function simpleLeaflet(input:{drugName?:unknown;originCountry?:unknown;drugDosage?:unknown;lang?:unknown}){
 if(!simpleLeafletEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 if(typeof input.drugName!=='string'||!input.drugName.trim()||typeof input.originCountry!=='string'||!input.originCountry.trim())return Response.json({error:'INVALID_INPUT'},{status:400});
 const key=process.env.ANTHROPIC_API_KEY?.trim();if(!key)return Response.json({error:'CLAUDE_KEY_MISSING'},{status:503});
 const medicine=equivalentPresentation(input.drugName,input.originCountry).title;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110_000);
 try{
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'anthropic-version':'2023-06-01'},cache:'no-store',signal:controller.signal,body:JSON.stringify({
   model:SIMPLE_LEAFLET_MODEL,max_tokens:16000,
   messages:[{role:'user',content:simpleLeafletPrompt(medicine,input.originCountry)}],
   tools:[{type:'web_search_20250305',name:'web_search'}]
  })});
  if(!response.ok)return Response.json({error:'CLAUDE_UNAVAILABLE'},{status:503});
  const payload=await response.json();
  if(payload.stop_reason!=='end_turn')return Response.json({error:'CLAUDE_INCOMPLETE'},{status:503});
  const text=(payload.content||[]).filter((block:any)=>block.type==='text').map((block:any)=>block.text).join('\n\n');
  if(!text.trim())return Response.json({error:'CLAUDE_EMPTY_RESPONSE'},{status:503});
  // Presentation cleanup only; no clinical rewriting, source gate or JSON parsing.
  const leafletText=text.replace(/<\/?cite\b[^>]*>/g,'');
  const sources=[...new Set<string>((payload.content||[]).flatMap((block:any)=>block.type==='web_search_tool_result'&&Array.isArray(block.content)?block.content.map((result:any)=>result.url):block.type==='text'&&Array.isArray(block.citations)?block.citations.map((cite:any)=>cite.url):[]).filter((url:any)=>typeof url==='string'&&/^https:\/\//.test(url)))];
  return Response.json({leaflet:{medicine_name:medicine,country:input.originCountry,dosage_hint:input.drugDosage||null,leaflet_text:leafletText,lang:'en'},sources,model:payload.model,usage:payload.usage},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'CLAUDE_UNAVAILABLE'},{status:503});}
 finally{clearTimeout(timer);}
}
