const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),base='48eff0c4967544f1dd9a5e3c17a163e6f403cd2c';
function client(env){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'app/lib/openaiClient.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env}});return module.exports;}
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'experiment/legacy-sol-model-only'};
test('legacy clone keeps all application files except model transport byte-identical to the tested deployment',()=>{
 const files=execFileSync('git',['diff','--name-only',base,'--','app','lib','components','public','styles','package.json','package-lock.json','next.config.js','vercel.json'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 assert.deepEqual(files,['app/lib/openaiClient.ts']);
});
test('only GPT-4o model and required compatibility parameters change; prompts, seed and contracts stay exact',()=>{
 const c=client(env),body={model:'gpt-4o',temperature:0.2,seed:12345,response_format:{type:'json_object'},messages:[{role:'system',content:'Preserve this prompt verbatim.'},{role:'user',content:'Public test'}]},request={method:'POST',body:JSON.stringify(body)},actual=JSON.parse(c.modelUpgradeRequest(request).body);
 const expected={...body,model:'gpt-6.1-sol'};delete expected.temperature;assert.deepEqual(actual,expected);assert.equal(actual.reasoning_effort,undefined);
 for(const model of ['gpt-4o-mini','gpt-4','gpt-6.1-sol']){const other={body:JSON.stringify({...body,model})};assert.equal(c.modelUpgradeRequest(other),other);}
 assert.equal(c.modelUpgradeEnabled(),false);assert.equal(c.experimentalPromptsEnabled(),false);assert.equal(c.travelSolEnabled(),false);assert.equal(c.originIdentificationEnabled(),false);assert.equal(c.modelTestConfiguration().leafletFormat,'legacy');
 const capped=JSON.parse(c.modelUpgradeRequest({body:JSON.stringify({...body,max_tokens:900})}).body);assert.equal(capped.max_completion_tokens,900);assert.equal(capped.max_tokens,undefined);
});
test('new model override never activates on Production, the locked Dev or the original legacy branch',()=>{
 const request={body:JSON.stringify({model:'gpt-4o',temperature:0.2,seed:12345,messages:[]})};
 for(const settings of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview'},{...env,VERCEL_GIT_COMMIT_REF:'investigation/price-only-20261020'},{}])assert.equal(client(settings).modelUpgradeRequest(request),request);
});
