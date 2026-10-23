import template from './simple-leaflet-prompt.json';
import {equivalentPresentation} from './match-display';
import {readClaudeTextStream} from './claude-text-stream';

export function simpleLeafletEnabled(){
 return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='experiment/claude-simple-leaflet'&&process.env.MEDICEA_CLAUDE_PREVIEW!=='false';
}
export const SIMPLE_LEAFLET_MODEL='claude-sonnet-5-5';
// The owner's approved screenshot prompt, with medicine/country slots.
// These are the only substitutions. No application instructions are appended.
export function simpleLeafletPrompt(medicine:string,country:string,strength?:string){
 const product=strength?.trim()?`${medicine} ${strength.trim()}`:medicine;
 return template.replace(/\{medicine\}|\{Country\}/g,slot=>slot==='{medicine}'?product:country);
}
export async function simpleLeaflet(input:{drugName?:unknown;originCountry?:unknown;drugDosage?:unknown;lang?:unknown},options:{stream?:boolean;signal?:AbortSignal}={}){
 if(!simpleLeafletEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 if(typeof input.drugName!=='string'||!input.drugName.trim()||typeof input.originCountry!=='string'||!input.originCountry.trim())return Response.json({error:'INVALID_INPUT'},{status:400});
 const key=process.env.ANTHROPIC_API_KEY?.trim();if(!key)return Response.json({error:'CLAUDE_KEY_MISSING'},{status:503});
 const country=input.originCountry,medicine=equivalentPresentation(input.drugName,country).title;
 const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,110_000);
 options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted)cancel();
 const started=Date.now();let firstTextMs:number|undefined;
 const clean=(text:string)=>text.replace(/<\/?cite\b[^>]*(?:>|$)/g,'');
 const pack=(text:string,sources:string[],model=SIMPLE_LEAFLET_MODEL,usage:unknown=undefined)=>({leaflet:{medicine_name:medicine,country,dosage_hint:input.drugDosage||null,leaflet_text:clean(text),lang:'en'},sources,model,usage,timing:{firstTextMs,totalMs:Date.now()-started}});
 async function run(progress?:(payload:unknown)=>void){
  try{
   const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'anthropic-version':'2023-06-01'},cache:'no-store',signal:controller.signal,body:JSON.stringify({
    model:SIMPLE_LEAFLET_MODEL,max_tokens:16000,output_config:{effort:'medium'},stream:true,
    messages:[{role:'user',content:simpleLeafletPrompt(medicine,country,typeof input.drugDosage==='string'?input.drugDosage:undefined)}],
    tools:[{type:'web_search_20250305',name:'web_search'}]
   })});
   if(!response.ok)throw Error('CLAUDE_UNAVAILABLE');
   let lastUpdate=0;
   const payload=await readClaudeTextStream(response,(text,sources)=>{
    if(firstTextMs===undefined)firstTextMs=Date.now()-started;
    // Send the first answer text immediately, then batch very small token deltas.
    if(progress&&(!lastUpdate||Date.now()-lastUpdate>=200)){lastUpdate=Date.now();progress(pack(text,sources));}
   });
   return Response.json(pack(payload.text,payload.sources,payload.model,payload.usage),{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'CLAUDE_UNAVAILABLE',diagnosticCode:'LEAFLET_STREAM_INCOMPLETE'},{status:503});}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
 }
 if(!options.stream)return run();
 let cancelled=false;
 const encoder=new TextEncoder();
 const body=new ReadableStream({start(output){
  const send=(type:string,payload:unknown)=>{if(!cancelled)output.enqueue(encoder.encode(JSON.stringify({type,payload})+'\n'));};
  void run(payload=>send('ready',payload)).then(async result=>{send(result.ok?'complete':'error',await result.json());}).catch(()=>send('error',{diagnosticCode:'LEAFLET_STREAM_INCOMPLETE'})).finally(()=>{if(!cancelled)output.close();});
 },cancel(){cancelled=true;cancel();}});
 return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no','Vary':'Accept'}});
}
