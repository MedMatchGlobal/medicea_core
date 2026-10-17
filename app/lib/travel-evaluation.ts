import {withOpenAIEvaluation} from './openaiClient';
import {lookupOrigin,issueOriginSelection,type OriginProduct} from './origin-lookup';
import {promptMatchedSearch} from './prompt-matches';
import {exactComposition} from './source-matches';
import {isMedicineName} from './match-display';
import {TRAVEL_EVALUATION_CASES,type TravelEvaluationCaseId,type TravelEvaluationArm} from './travel-evaluation-fixtures';
import {POST as productionSearch} from '../api/openai/equivalent-search/route';
const norm=(s:unknown)=>typeof s==='string'?s.trim().toLowerCase().replace(/\s+/g,' '):'';
function normaliseSpecies(p:any){return p&&Array.isArray(p.species)&&p.species.length===1&&norm(p.species[0])==='human'?{...p,species:[]}:p;}
export function auditEvaluationCandidates(origin:OriginProduct,values:unknown,targetCountry:string){
 return (Array.isArray(values)?values:[]).slice(0,20).map(value=>{
  const p=normaliseSpecies(value),reasons:string[]=[];
  if(!p||typeof p!=='object')return {name:'Invalid profile',accepted:false,reasons:['invalid profile']};
  if(!isMedicineName(p.name)||p.name.length>250)reasons.push('invalid medicine name');
  if(norm(p.country)!==norm(targetCountry))reasons.push('target country differs');
  if(/unknown|unspecified/i.test(p.form+' '+p.route))reasons.push('unknown form or route');
  if(p.complete!==true)reasons.push('incomplete profile');
  if(!Array.isArray(p.species)||p.species.length)reasons.push('human species representation');
  if(norm(p.form)!==norm(origin.form))reasons.push('form description differs');
  if(norm(p.route)!==norm(origin.route))reasons.push('route differs');
  if(!exactComposition(origin,{...p,form:origin.form,route:origin.route,species:[],complete:true}))reasons.push('ingredient/strength text differs or is invalid');
  return {name:typeof p.name==='string'?p.name.slice(0,250):'Invalid name',form:norm(p.form),route:norm(p.route),ingredients:Array.isArray(p.ingredients)?p.ingredients.slice(0,20).map((i:any)=>({name:typeof i?.name==='string'?i.name.slice(0,250):'',strength:typeof i?.strength==='string'?i.strength.slice(0,250):''})):[],accepted:!reasons.length&&exactComposition(origin,p),reasons};
 });
}
export async function evaluateTravelCase(caseId:TravelEvaluationCaseId,arm:TravelEvaluationArm){
 const fixture=TRAVEL_EVALUATION_CASES.find(c=>c.id===caseId);if(!fixture||!['production','experimental'].includes(arm))throw Error('INVALID_FIXTURE');
 const start=Date.now();let established:OriginProduct|undefined;
 const result=await withOpenAIEvaluation(arm==='production',async()=>{
  try{
   let response:Response;
   if(arm==='production')response=await productionSearch(new Request('https://owner-demo.invalid/api/openai/equivalent-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixture.input)}));
   else{
    const products=await lookupOrigin(fixture.input);
    const matching=products.filter(p=>fixture.form==='film-coated'?/film[ -]*coated/i.test(p.form+' '+p.name):/tablet/i.test(p.form)&&!/effervescent|soluble|dispersible|modified|prolonged/i.test(p.form+' '+p.name));
    if(matching.length!==1)return {status:422,error:matching.length?'AMBIGUOUS_FIXTURE_FORMULATION':'FIXTURE_ORIGIN_UNCONFIRMED',matches:[] as string[],raw:''};
    established=matching[0];
    response=await promptMatchedSearch({...fixture.input,originSelection:issueOriginSelection(established,fixture.input.drugName)},'international');
   }
   const data=await response.json();
   return {status:response.status,error:typeof data.error==='string'?data.error:'',matches:Array.isArray(data.matches)?data.matches.slice(0,10).map((m:any)=>String(m.medicine_name||'').slice(0,1000)):[],raw:typeof data.equivalentResults?.raw_text==='string'?data.equivalentResults.raw_text.slice(0,20000):''};
  }catch{return {status:503,error:'EVALUATION_UNAVAILABLE',matches:[] as string[],raw:''};}
 });
 let audit:ReturnType<typeof auditEvaluationCandidates>=[];
 if(established){for(const call of result.calls){try{const p=JSON.parse(call.text);if(Array.isArray(p.candidates))audit=auditEvaluationCandidates(established,p.candidates,fixture.input.targetCountry);}catch{}}}
 // Return bounded public-fixture data and provider accounting, never request
 // headers, credentials, signed origin selections or caller-supplied records.
 return {id:crypto.randomUUID(),caseId,arm,checkedAt:new Date().toISOString(),ms:Date.now()-start,...result.value,
  origin:established?{name:established.name,form:established.form,route:established.route,ingredients:established.ingredients}:null,
  calls:result.calls.map(({text,...call})=>call),audit,
  checks:{ukReferenceMentioned:caseId==='it30-gb'?/zapain|co[ -]*codamol/i.test(result.value.raw):null,wrongStrengthBrandMentioned:caseId==='uk8-it'?/co[ -]*efferalgan/i.test(result.value.raw):null},
  note:'Discovery diagnostics only. A reference mention is not proof of equivalence, availability or complete market coverage. Missing token usage is unknown, not zero.'};
}
