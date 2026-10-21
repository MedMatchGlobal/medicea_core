// Fixed public medicine fixtures against the owner-authorised Preview only.
// Never print credentials, signed selection tokens, cookies or user records.
const assert=require('node:assert/strict');
const base=process.argv[2];
assert.ok(/^https:\/\/medicea-core-[a-z0-9-]+-medmatchglobals-projects\.vercel\.app\/?$/.test(base||''));
const input={drugName:'Co-codamol',originCountry:'United Kingdom',targetCountry:'Italy',lang:'en'};
async function run(body){const start=Date.now(),r=await fetch(base.replace(/\/$/,'')+'/api/openai/equivalent-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(115000)});const data=await r.json();return {status:r.status,ms:Date.now()-start,data};}
(async()=>{
 const first=await run(input);console.log(JSON.stringify({stage:'origin choices',status:first.status,ms:first.ms,error:first.data.error,diagnostic:first.data.diagnostic,variants:first.data.variants?.map(v=>({name:v.name,ingredients:v.ingredients,sources:v.sources}))}));
 assert.equal(first.status,409);
 for(const strength of [8,30]){
  const chosen=first.data.variants.find(v=>v.ingredients.some(i=>new RegExp('^'+strength+'\\s*mg\\b').test(i.strength))&&/tablet/i.test(v.form)&&!/effervescent|soluble/i.test(v.form));assert.ok(chosen,'Required conventional tablet choice');
  const result=await run({...input,originSelection:chosen.token});
  console.log(JSON.stringify({stage:'selected '+strength,status:result.status,ms:result.ms,error:result.data.error,diagnostic:result.data.diagnostic,matches:result.data.matches,sources:result.data.equivalentResults?.origin_sources}));assert.equal(result.status,200);
  for(const m of result.data.matches)assert.ok(m.ingredients.some(i=>new RegExp('^'+strength+'\\s*mg\\b').test(i.strength)),'No wrong-strength substitution');
  if(strength===30){assert.ok(result.data.matches.some(m=>/efferalgan/i.test(m.medicine_name)),'Known film-coated Co-Efferalgan is found');assert.ok(result.data.matches.length>1,'Coverage improves beyond one product');}
 }
})().catch(e=>{console.error(e.name+': '+e.message);process.exitCode=1;});
