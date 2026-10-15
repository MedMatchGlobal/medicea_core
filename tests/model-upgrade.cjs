const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(env){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/lib/openaiClient.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env}});return module.exports.modelUpgradeRequest;}
const request=body=>({method:'POST',body:JSON.stringify(body)});
test('upgrade is opt-in and impossible in Production even with the switch set',()=>{
 const init=request({model:'gpt-4o',messages:[]});
 for(const env of [{VERCEL_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'},{VERCEL_ENV:'preview'},{NODE_ENV:'production',MEDICEA_OPENAI_UPGRADE:'true'}])assert.equal(load(env)(init),init);
});
test('Preview upgrade keeps prompts and JSON contracts, separates medical and fast tiers',()=>{
 const upgrade=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true'});
 const original={model:'gpt-4o',messages:[{role:'system',content:'Exact protected prompt'},{role:'user',content:'Unchanged input'}],temperature:0,seed:12345,max_tokens:900,response_format:{type:'json_object'}};
 const medical=JSON.parse(upgrade(request(original)).body);assert.equal(medical.model,'gpt-6-astra');assert.equal(medical.reasoning_effort,'low');assert.deepEqual(medical.messages,original.messages);assert.deepEqual(medical.response_format,original.response_format);assert.equal(medical.max_completion_tokens,900);for(const key of ['max_tokens','temperature','seed'])assert.ok(!(key in medical));
 const fast=JSON.parse(upgrade(request({...original,model:'gpt-4o-mini',temperature:0.2})).body);assert.equal(fast.model,'gpt-6-luna');assert.equal(fast.reasoning_effort,'none');assert.equal(fast.temperature,0.2);
 assert.equal(original.seed,12345);
});
test('pinned/unknown models stay unchanged and unsupported tool migrations fail explicitly',()=>{
 const upgrade=load({VERCEL_ENV:'preview',MEDICEA_OPENAI_UPGRADE:'true'});
 for(const model of ['gpt-4o-2024-08-06','gpt-6.1-sol','other-provider']){const init=request({model,messages:[]});assert.equal(upgrade(init),init);}
 assert.throws(()=>upgrade(request({model:'gpt-4o',tools:[]})),/separate streaming\/tool migration/);
});
