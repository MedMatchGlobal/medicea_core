// Public product examples only. No patient data; never print selection tokens or keys.
const assert=require('node:assert/strict'),{harness,request}=require('./test-production-ui-live.cjs');
const route='app/api/openai/equivalent-search/route.ts';
async function run(h,input){const start=Date.now(),response=await h.load(route).POST(request(input)),data=await response.json();return {status:response.status,ms:Date.now()-start,data};}
(async()=>{
 const input={drugName:'Co-codamol',originCountry:'United Kingdom',targetCountry:'Italy',lang:'en'},h=harness();
 const first=await run(h,input);
 console.log(JSON.stringify({stage:'origin choices',status:first.status,ms:first.ms,error:first.data.error,variants:first.data.variants?.map(v=>({name:v.name,ingredients:v.ingredients})),calls:h.calls}));
 assert.equal(first.status,409);assert.ok(first.data.variants.some(v=>v.ingredients.some(i=>/^8\s*mg\b/.test(i.strength))));assert.ok(first.data.variants.some(v=>v.ingredients.some(i=>/^30\s*mg\b/.test(i.strength))));
 for(const strength of [8,30]){
  const chosen=first.data.variants.find(v=>v.ingredients.some(i=>new RegExp('^'+strength+'\\s*mg\\b').test(i.strength))&&/tablet/i.test(v.form)&&!/effervescent|soluble/i.test(v.form));assert.ok(chosen,'Required tablet choice is offered');
  const followup=harness(),result=await run(followup,{...input,originSelection:chosen.token});
  console.log(JSON.stringify({stage:'selected '+strength+' mg',status:result.status,ms:result.ms,error:result.data.error,origin:result.data.originProfile?.active_ingredients,matches:result.data.matches,calls:followup.calls}));assert.equal(result.status,200);
  assert.ok(result.data.originProfile.active_ingredients.some(i=>new RegExp('^'+strength+'\\s*mg\\b').test(i.strength)));
  for(const match of result.data.matches)assert.ok(match.ingredients.some(i=>new RegExp('^'+strength+'\\s*mg\\b').test(i.strength)));
  if(strength===8)assert.ok(!result.data.matches.some(m=>/efferalgan/i.test(m.medicine_name)),'500/8 must not match Co Efferalgan');
 }
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
