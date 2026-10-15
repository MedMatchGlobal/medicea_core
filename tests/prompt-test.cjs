const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function helpers(client){const cache={};function load(name){if(cache[name])return cache[name];const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env:{}},URL,Response,AbortController,setTimeout,clearTimeout,require:name=>name==='./openaiClient'?client:load(name.slice(2))});return cache[name]=module.exports;}return load('prompt-matches');}
const origin={name:'Co-codamol 8/500 tablets',country:'United Kingdom',form:'tablet',route:'oral',species:[],complete:true,generic:false,ingredients:[{name:'Paracetamol',strength:'500 mg/tablet'},{name:'Codeine phosphate',strength:'8 mg/tablet'}]};
const input={drugName:'CoCodamol',originCountry:'United Kingdom',targetCountry:'Italy',drugDosage:'500 + 8'};
const result=value=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
test('prompt experiment rejects different-strength candidates without presenting generated data as source verified',async()=>{
 let calls=0;const helper=helpers({modelUpgradeEnabled:()=>true,modelTestConfiguration:()=>({researchModel:'gpt-6.1-sol'}),openaiFetch:async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.model,'gpt-6.1-sol');assert.equal(body.store,false);assert.equal(body.reasoning_effort,'low');assert.ok(body.messages[0].content.length<1800);calls++;return result(calls===1?{origin}:{candidates:[{...origin,country:'Italy',name:'Wrong 500/30',ingredients:[origin.ingredients[0],{name:'Codeine phosphate',strength:'30 mg/tablet'}]}]});}});
 const response=await helper.promptMatchedSearch(input,'international');assert.equal(response.status,200);const data=await response.json();assert.equal(data.matches.length,0);assert.equal(data.equivalentResults.verification,'model_generated_full_composition');assert.equal(calls,2);
});
test('prompt experiment stops on unknown or conflicting origin instead of overriding it',async()=>{
 for(const profile of [null,{...origin,ingredients:[origin.ingredients[0],{name:'Codeine phosphate',strength:'30 mg/tablet'}]}]){let calls=0;const helper=helpers({modelUpgradeEnabled:()=>true,modelTestConfiguration:()=>({researchModel:'gpt-6.1-sol'}),openaiFetch:async()=>{calls++;return result({origin:profile});}});assert.equal((await helper.promptMatchedSearch(input,'international')).status,422);assert.equal(calls,1);}
});
test('prompt experiment cannot run with the upgrade disabled',async()=>{
 const helper=helpers({modelUpgradeEnabled:()=>false,openaiFetch:()=>{throw Error('must not call');}});assert.equal((await helper.promptMatchedSearch(input,'international')).status,404);
});
test('explicit human species normalizes to the human-only representation without accepting animal products',async()=>{
 let calls=0;const helper=helpers({modelUpgradeEnabled:()=>true,modelTestConfiguration:()=>({researchModel:'gpt-6.1-sol'}),openaiFetch:async()=>result(++calls===1?{origin:{...origin,species:[' Human ']}}:{candidates:[{...origin,name:'Human fixture',country:'Italy',species:['HUMAN']},{...origin,name:'Dog fixture',country:'Italy',species:['dog']}]})});
 const response=await helper.promptMatchedSearch(input,'international');const data=await response.json();assert.equal(response.status,200);assert.equal(data.matches.length,1);assert.match(data.matches[0].medicine_name,/Human fixture/);
});
