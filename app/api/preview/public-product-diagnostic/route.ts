import {claudePreviewEnabled,withClaudeEvaluation} from '@/app/lib/claude-preview';
import {productionStrengthSearch} from '@/app/lib/sonnet-research-matches';
export const dynamic='force-dynamic';
export const maxDuration=60;
// Temporary fixed-public-fixture diagnostic, protected by the project's Vercel
// Authentication. No request input, customer identity, database, billing or mail.
// Explicit branch/project/flag gates prevent use on other environments. Remove
// after diagnosis; at most one provider operation per warm function instance.
let pending:Promise<unknown>|undefined;
async function check(){
 const trial=await withClaudeEvaluation(async()=>{
  const response=await productionStrengthSearch({drugName:'Co Efferalgan',originCountry:'Italy',targetCountry:'Italy'},true);
  const body=await response.json();
  return {status:response.status,error:body.error||null,choiceCount:body.variants?.length||0,reasons:body.unconfirmedVariants?.map((p:any)=>p.codes)||[]};
 });
 return {...trial.value,publicProfiles:trial.calls.flatMap(call=>{
  try{const reply=JSON.parse(call.text);return (reply.products||[]).map((p:any)=>({name:p.name,country:p.country,form:p.form,route:p.route,release:p.release,complete:p.complete,generic:p.generic,species:p.species,ingredients:p.ingredients,sourceCount:p.sources?.length||0}));}catch{return [];}
 }),calls:trial.calls.map(call=>({model:call.model,ms:call.ms,usage:call.usage})),fixture:'Fixed public Co Efferalgan Italy product identification; no customer data'};
}
export async function GET(){
 if(!claudePreviewEnabled()||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE'||process.env.MEDICEA_PUBLIC_PRODUCT_DIAGNOSTIC!=='true')return new Response(null,{status:404});
 pending??=check().catch(()=>({error:'PUBLIC_DIAGNOSTIC_UNAVAILABLE'}));
 return Response.json(await pending,{headers:{'Cache-Control':'private, no-store'}});
}
