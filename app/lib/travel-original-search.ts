import {openaiFetch,withOpenAIEvaluation} from './openaiClient';
import {issueOriginSelection,readOriginSelection,type OriginProduct} from './origin-lookup';
import {isMedicineName} from './match-display';
import {POST as originalSearch} from '../api/openai/equivalent-search/route';

// Owner-requested rollback, confined by withOpenAIEvaluation to the signed
// Travel Preview. Do not infer formulation, route or source verification from
// the original prompt: it returns composition only.
export async function originalTravelOrigin(drugName:string,originCountry:string,drugDosage:string){
 const result=await withOpenAIEvaluation(true,async()=>{
  const system1 =
      "You are a structured medical data extractor. Return JSON only with medicine_name, origin_country, and active_ingredients[{name, strength}].";
  const user1 = `
Find the full composition (active ingredient names AND exact label strengths) of the medicine called "${drugName}"
sold in ${originCountry}${drugDosage ? ` (user-entered dosage hint: "${drugDosage}")` : ""}.
Return strictly JSON with keys: medicine_name, origin_country, active_ingredients[{name, strength}]. No extra text.
`.trim();
  const response=await openaiFetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-6.1-sol',reasoning_effort:'low',response_format:{type:'json_object'},messages:[{role:'system',content:system1},{role:'user',content:user1}]})});
  const payload=await response.json();if(payload.choices?.[0]?.finish_reason!=='stop')throw Error('INCOMPLETE_ORIGINAL_LOOKUP');
  const p=JSON.parse(payload.choices[0].message.content);
  if(p.error||!isMedicineName(p.medicine_name)||p.medicine_name.length>250||typeof p.origin_country!=='string'||p.origin_country.trim().toLowerCase()!==originCountry.trim().toLowerCase()||!Array.isArray(p.active_ingredients)||!p.active_ingredients.length||p.active_ingredients.length>20)return [];
  if(p.active_ingredients.some((i:any)=>typeof i?.name!=='string'||!i.name.trim()||i.name.length>250||typeof i.strength!=='string'||i.strength.length>250||!/[0-9]/.test(i.strength)))return [];
  return [{name:p.medicine_name,country:originCountry,ingredients:p.active_ingredients,form:'Not provided by original lookup',route:'Not provided by original lookup',species:[],complete:true,generic:false,sources:[],lookup:'original'} as OriginProduct];
 });
 return result.value;
}
export async function originalTravelCompare(query:string,originCountry:string,targetCountry:string,dosage:string,token:unknown){
 let selected=readOriginSelection(token,query,originCountry,dosage);
 if(token&&!selected)return Response.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422,headers:{'Cache-Control':'no-store'}});
 if(!selected){const products=await originalTravelOrigin(query,originCountry,dosage);selected=products[0]||null;}
 if(!selected)return Response.json({error:'NOT_FOUND_ORIGIN'},{status:422});
 const result=await withOpenAIEvaluation(true,()=>originalSearch(new Request('https://owner-demo.invalid/api/openai/equivalent-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drugName:query,originCountry,targetCountry,drugDosage:dosage})})));
 const response=result.value,data=await response.json();
 if(!response.ok||data.error)return Response.json({error:'SEARCH_UNAVAILABLE'},{status:503});
 const raw=data.equivalentResults?.raw_text;
 if(typeof raw!=='string'||!raw.trim())return Response.json({error:'SEARCH_UNAVAILABLE'},{status:503});
 // Keep original output as suggestions, never as exact/source-verified matches.
 const matches=raw.split(/\r?\n/).map((s:string)=>s.trim()).filter((s:string)=>isMedicineName(s)&&!/^No response\.?$/i.test(s)).slice(0,10).map((medicine_name:string)=>({medicine_name}));
 return Response.json({product:{...selected,query,dosage,token:issueOriginSelection(selected,query)},matches,verification:'original_prompt_unverified',checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}
