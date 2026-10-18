const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function client(env,runtime={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/lib/openaiClient.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env},...runtime});return module.exports;}
const load=env=>client(env).modelUpgradeRequest;
const request=body=>({method:'POST',body:JSON.stringify(body)});
test('only connected Travel research gets a longer attempt and ambiguous failures never retry another key',async()=>{
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_TRAVEL_CONNECTED:'true',OPENAI_API_KEY_1:'fixture-one',OPENAI_API_KEY_2:'fixture-two'};
 const original=request({model:'gpt-6.1-sol',messages:[{role:'user',content:'Public test'}],reasoning_effort:'low'});
 for(const settings of [env,{...env,VERCEL_ENV:'production'},{...env,MEDICEA_TRAVEL_CONNECTED:'false'},{...env,VERCEL_GIT_COMMIT_REF:'feature/openai-model-upgrade-preview'}]){
  const timers=[],sent=[];const c=client(settings,{Headers,Response,AbortController,setTimeout:(fn,ms)=>{timers.push(ms);return 1;},clearTimeout:()=>{},fetch:async(url,init)=>{sent.push(init.body);return Response.json({ok:true});}});
  await c.openaiFetch('https://api.openai.com/v1/chat/completions',original);assert.equal(timers[0],settings===env?55000:10000);assert.equal(sent[0],original.body);
 }
 let attempts=0;const c=client(env,{Headers,Response,AbortController,setTimeout:()=>1,clearTimeout:()=>{},fetch:async()=>{attempts++;throw Error('ambiguous disconnect');}});
 await assert.rejects(c.openaiFetch('https://api.openai.com/v1/chat/completions',original),error=>error.status===504&&error.attempts===1);assert.equal(attempts,1);
});
test('only the authorised tester branch defaults on; explicit false and Production win',()=>{
 const branch={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/openai-model-upgrade-preview'};
 assert.equal(client(branch).modelUpgradeEnabled(),true);
 assert.equal(client({...branch,MEDICEA_OPENAI_UPGRADE:'false'}).modelUpgradeEnabled(),false);
 assert.equal(client({...branch,MEDICEA_OPENAI_UPGRADE:'typo'}).modelUpgradeEnabled(),false);
 assert.equal(client({...branch,VERCEL_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'}).modelUpgradeEnabled(),false);
 assert.equal(client({...branch,VERCEL_GIT_COMMIT_REF:'feature/monetisation-preview'}).modelUpgradeEnabled(),false);
 assert.equal(client({...branch,VERCEL_GIT_COMMIT_REF:'feature/private-vault'}).modelUpgradeEnabled(),false);
 assert.equal(client(branch).modelTestConfiguration().revision,'exact-match-v3.1');
});
test('Responses source-research endpoint is blocked outside the opted-in Preview',async()=>{
 const endpoint='https://api.openai.com/v1/responses';
 for(const env of [{VERCEL_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'},{VERCEL_ENV:'preview'},{NODE_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'}])await assert.rejects(client(env).openaiFetch(endpoint,request({})),/Unsupported OpenAI endpoint/);
 await assert.rejects(client({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true'}).openaiFetch(endpoint,request({})),/No OpenAI API keys/);
});
test('upgrade is opt-in and impossible in Production even with the switch set',()=>{
 const init=request({model:'gpt-4o',messages:[]});
 for(const env of [{VERCEL_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'},{VERCEL_ENV:'preview'},{NODE_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'}])assert.equal(load(env)(init),init);
});
test('Preview upgrade keeps prompts and JSON contracts, separates medical and fast tiers',()=>{
 const upgrade=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_OPENAI_MEDICAL_MODEL:'gpt-6-astra'});
 const original={model:'gpt-4o',messages:[{role:'system',content:'Exact protected prompt'},{role:'user',content:'Unchanged input'}],temperature:0,seed:12345,max_tokens:900,response_format:{type:'json_object'}};
 const medical=JSON.parse(upgrade(request(original)).body);assert.equal(medical.model,'gpt-6-astra');assert.equal(medical.reasoning_effort,'low');assert.deepEqual(medical.messages,original.messages);assert.deepEqual(medical.response_format,original.response_format);assert.equal(medical.max_completion_tokens,900);for(const key of ['max_tokens','temperature','seed'])assert.ok(!(key in medical));
 const fast=JSON.parse(upgrade(request({...original,model:'gpt-4o-mini',temperature:0.2})).body);assert.equal(fast.model,'gpt-6-luna');assert.equal(fast.reasoning_effort,'none');assert.equal(fast.temperature,0.2);
 assert.equal(original.seed,12345);
});
test('latency-sensitive default uses Luna without reasoning and preserves sampling',()=>{
 const upgrade=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true'});
 const body=JSON.parse(upgrade(request({model:'gpt-4o',temperature:0,seed:12345})).body);
 assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning_effort,'none');assert.equal(body.temperature,0);assert.ok(!('seed'in body));
 const sol=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_OPENAI_MEDICAL_MODEL:'gpt-6.1-sol'});
 assert.equal(JSON.parse(sol(request({model:'gpt-4'})).body).model,'gpt-6.1-sol');
 const invalid=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_OPENAI_MEDICAL_MODEL:'typo'});assert.throws(()=>invalid(request({model:'gpt-4o'})),/Unsupported Preview medical model/);
});
test('pinned/unknown models stay unchanged and unsupported tool migrations fail explicitly',()=>{
 const upgrade=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true'});
 for(const model of ['gpt-4o-2024-08-06','gpt-6.1-sol','other-provider']){const init=request({model,messages:[]});assert.equal(upgrade(init),init);}
 assert.throws(()=>upgrade(request({model:'gpt-4o',tools:[]})),/separate streaming\/tool migration/);
});

test('Travel deployment migrates all legacy GPT-4 family workloads to Sol without changing any prompt bytes',()=>{
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_TRAVEL_CONNECTED:'true',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_OPENAI_MEDICAL_MODEL:'gpt-6-luna',MEDICEA_OPENAI_SOURCE_MODEL:'gpt-6-luna'};
 const c=client(env);assert.equal(c.modelTestConfiguration().informationModel,'gpt-6.1-sol');assert.equal(c.modelTestConfiguration().researchModel,'gpt-6.1-sol');
 for(const model of ['gpt-4o','gpt-4o-mini','gpt-4o-2024-08-06','gpt-4','gpt-4-0613','gpt-6.1-sol']){
  const original={model,messages:[{role:'system',content:'Exact prompt\n\nKeep 40 mg + 30 mg.'},{role:'user',content:'Unchanged user input'}],temperature:0.2,seed:12345,top_p:1,logprobs:true,max_tokens:900,response_format:{type:'json_object'}};
  const migrated=JSON.parse(c.modelUpgradeRequest(request(original)).body);assert.equal(migrated.model,'gpt-6.1-sol');assert.equal(migrated.reasoning_effort,'low');assert.deepEqual(migrated.messages,original.messages);assert.deepEqual(migrated.response_format,original.response_format);assert.equal(migrated.max_completion_tokens,900);for(const field of ['temperature','seed','top_p','logprobs','max_tokens'])assert.equal(migrated[field],undefined);assert.equal(original.seed,12345);
 }
 const production=client({...env,VERCEL_ENV:'production'}),original=request({model:'gpt-4o',temperature:0,messages:[]});assert.equal(production.modelUpgradeRequest(original),original);
});
