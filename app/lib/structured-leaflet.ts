import {openaiFetch,travelSolEnabled} from './openaiClient';
import {baselineLeafletPrompt,organisedHumanLeafletPrompt} from './leaflet-prompts';
import {reuseLeaflet} from './leaflet-reuse';
import {lookupLeafletPrice} from './leaflet-price';
import {readOriginSelection} from './origin-lookup';
import {LEAFLET_RESPONSE_FORMAT,validateLeaflet,leafletText} from './leaflet-contract';
import {veterinarySectionLabels} from '../i18n/veterinary-sections';

export async function structuredLeaflet(input:{drugName:unknown;originCountry:unknown;drugDosage?:unknown;lang?:unknown;originSelection?:unknown;originQueryName?:unknown},audience:'human'|'veterinary'='human',onReady?:(payload:unknown)=>void):Promise<Response>{
 if(!travelSolEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 const started=Date.now();
 const {drugName,originCountry,drugDosage}=input;
 if(typeof drugName!=='string'||!drugName.trim()||drugName.length>250||typeof originCountry!=='string'||!originCountry.trim()||originCountry.length>200||drugDosage!=null&&(typeof drugDosage!=='string'||drugDosage.length>100))return Response.json({error:'INVALID_INPUT'},{status:400});
 const lang=typeof input.lang==='string'&&/^[a-z]{2}$/.test(input.lang)?input.lang:'en';
 const selected=input.originSelection?readOriginSelection(input.originSelection,typeof input.originQueryName==='string'?input.originQueryName:drugName,originCountry,drugDosage):null;
 if(input.originSelection&&!selected)return Response.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422});
 const organised=audience==='human'&&process.env.MEDICEA_ORGANISED_LEAFLET!=='false';
 const instructions=organised?organisedHumanLeafletPrompt(new Intl.DisplayNames(['en'],{type:'language'}).of(lang)||lang):baselineLeafletPrompt(audience);
 const promptBaseline=organised?'organised-human-v1':'5af3e82';
 return reuseLeaflet(JSON.stringify({instructions,drugName,originCountry,drugDosage:drugDosage||'',lang,audience,selected}),async ready=>{
 try{
  const response=await openaiFetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-6.1-sol',reasoning_effort:'low',store:false,max_completion_tokens:6500,response_format:LEAFLET_RESPONSE_FORMAT,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({drugName,originCountry,drugDosage:drugDosage||'',language:lang,audience,selectedProfile:selected})}]})});
  const payload=await response.json(),choice=payload.choices?.[0];if(choice?.finish_reason!=='stop'||choice.message?.refusal||typeof choice.message?.content!=='string')throw Error('INCOMPLETE_LEAFLET');
  const sections=validateLeaflet(JSON.parse(choice.message.content)),unknown=veterinarySectionLabels(lang).unknown;
  // Preserve already selected composition even when generation omits Strength.
  // A signed selection proves continuity with a prior lookup, not clinical verification.
  const strength=sections.find(s=>s.key==='Strength')!;
  if(!strength.bullets.length&&selected?.ingredients?.length){
   strength.bullets=selected.ingredients.map(i=>`${i.name}: ${i.strength}`);
   validateLeaflet({information_sections:Object.fromEntries(sections.map(s=>[s.key,s.bullets]))});
  }
  const result=()=>({kind:'structured_leaflet_v2',promptBaseline,sections:sections.map(s=>({...s,bullets:s.bullets.length?s.bullets:[unknown]})),leaflet:{medicine_name:drugName,country:originCountry,dosage_hint:drugDosage||null,lang,kind:'structured_leaflet_v2',leaflet_text:leafletText(sections,unknown)},verification:'ai_generated_unverified',generatedAt:new Date().toISOString()});
  ready({...result(),pricePending:!sections.find(s=>s.key==='Average Selling Price')!.bullets.length});
  const generationMs=Date.now()-started;
  const priceStarted=Date.now();
  const price=sections.find(s=>s.key==='Average Selling Price')!;
  if(!price.bullets.length)price.bullets=await lookupLeafletPrice({drugName,originCountry,drugDosage:typeof drugDosage==='string'?drugDosage:undefined,lang,audience,selectedProfile:selected},55_000-(Date.now()-started));
  return Response.json(result(),{headers:{'Cache-Control':'no-store','X-Medicea-Leaflet-Baseline':promptBaseline,'X-Medicea-Leaflet-Cacheable':price.bullets.length?'1':'0','Server-Timing':`leaflet;dur=${generationMs}, price;dur=${Date.now()-priceStarted}, total;dur=${Date.now()-started}`}});
 }catch{return Response.json({error:'MEDICINE_INFORMATION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
 },onReady);
}
