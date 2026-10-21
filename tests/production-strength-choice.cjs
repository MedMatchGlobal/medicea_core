const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const fixtureFile=path.join(__dirname,'active-production-prompts.cjs'),source=fs.readFileSync(fixtureFile,'utf8'),fixture={exports:{}};
vm.runInNewContext(source.slice(0,source.indexOf('const structuredCases'))+'\nmodule.exports={harness};',{module:fixture,exports:fixture.exports,require:createRequire(fixtureFile),__dirname,Request,Response,Headers,URL,Buffer,AbortController,ReadableStream,TextEncoder,TextDecoder,setTimeout,clearTimeout});
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/production-prompts-new-ui',OPENAI_API_KEY:'fictional-strength-test',MEDICEA_OPENAI_UPGRADE:'true'};
const route='app/api/openai/equivalent-search/route.ts',input={drugName:'Fictional combination',originCountry:'United Kingdom',targetCountry:'Italy'};
const profile=(n,country='United Kingdom',extra={})=>({name:'Fictional combination '+n+'/500 tablets',country,form:'tablet',route:'oral',release:'immediate',species:[],complete:true,generic:true,ingredients:[{name:'Paracetamol',strength:'500 mg per tablet'},{name:'Codeine phosphate',strength:n+' mg per tablet'}],...extra});
const originReply=(products)=>JSON.stringify({variants_complete:true,products});
const candidates=(values)=>JSON.stringify({candidates:values});
const harness=(replies)=>fixture.exports.harness(env,replies,false);
const request=(body)=>new Request('https://public-fixture.invalid/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function run(h,body=input){const response=await h.load(route).POST(request(body));return {status:response.status,data:await response.json()};}
async function choose(hint){const h=harness([originReply([profile(8),profile(15),profile(30)])]),result=await run(h,{...input,...(hint?{drugDosage:hint}:{})});return {h,...result};}

test('blank strength proposes all variants and makes no destination call before selection',async()=>{
 const {h,status,data}=await choose();assert.equal(status,409);assert.equal(data.error,'CHOOSE_ORIGIN_VARIANT');assert.equal(data.variants.length,3);assert.equal(h.calls.length,1);assert.equal(h.calls[0].model,'gpt-4o');assert.match(data.variants[0].name,/Paracetamol: 500 mg per tablet/);assert.match(data.variants[0].name,/Codeine phosphate: 8 mg per tablet/);
});
test('both slash orders narrow by amounts without overwriting ingredient strengths',async()=>{
 for(const hint of ['500/8','8/500','500 mg + 8 mg']){
  const h=harness([originReply([profile(8),profile(15),profile(30)]),candidates([])]),{status,data}=await run(h,{...input,drugDosage:hint});assert.equal(status,200);assert.equal(data.originProfile.active_ingredients[1].strength,'8 mg per tablet');assert.deepEqual(Array.from(h.calls[1].messages,m=>m.role),['system','user']);assert.equal(data.matches.length,0);
 }
});
test('a partial shared hint and distinct formulations still require a choice',async()=>{
 const {status,data}=await choose('500');assert.equal(status,409);assert.equal(data.variants.length,3);
 const h=harness([originReply([profile(30),profile(30,'United Kingdom',{name:'Fictional soluble 30/500',form:'effervescent tablet'})])]);assert.equal((await run(h,{...input,drugDosage:'30/500'})).status,409);
});
test('signed choice reuses the selected origin and cannot return 500/30 for 500/8',async()=>{
 const selection=await choose();
 const good=profile(8,'Italy',{name:'Fictional exact',ingredients:[{name:'Codeine phosphate',strength:'8 mg per tablet'},{name:'Paracetamol',strength:'500 mg per tablet'}]});
 const bad=[profile(30,'Italy'),profile(15,'Italy'),profile(8,'Italy',{form:'effervescent tablet'}),profile(8,'Italy',{release:'modified'}),profile(8,'Italy',{ingredients:[...good.ingredients,{name:'Caffeine',strength:'30 mg per tablet'}]}),profile(8,'Italy',{ingredients:[{name:'Paracetamol',strength:'500 mg per ml'},{name:'Codeine phosphate',strength:'8 mg per ml'}]})];
 const h=harness([candidates([...bad,good])]),{status,data}=await run(h,{...input,originSelection:selection.data.variants[0].token});assert.equal(status,200);assert.equal(h.calls.length,1);assert.equal(data.matches.length,1);assert.match(data.matches[0].medicine_name,/Fictional exact/);assert.equal(JSON.parse(h.calls[0].messages[1].content).origin.ingredients[1].strength,'8 mg per tablet');assert.equal(data.equivalentResults.verification,'model_generated_full_composition');
});
test('all rejected candidates stay rejected, without unfiltered-text fallback',async()=>{
 const selection=await choose(),h=harness([candidates([profile(30,'Italy')])]),{status,data}=await run(h,{...input,originSelection:selection.data.variants[0].token});assert.equal(status,200);assert.deepEqual(data.matches,[]);assert.equal(data.equivalentResults.raw_text,'No matches.');
});
test('tampered, cross-query, cross-country and conflicting-strength selections fail before provider calls',async()=>{
 const selection=await choose(),token=selection.data.variants[0].token;
 for(const changed of [{originSelection:token+'x'},{originSelection:token,drugName:'Different product'},{originSelection:token,originCountry:'Italy'},{originSelection:token,drugDosage:'30/500'}]){
  const h=harness([]),result=await run(h,{...input,...changed});assert.equal(result.status,422);assert.equal(h.calls.length,0);
 }
});
test('unknown variant set, malformed amounts and unresolved strength ranges cannot select a default',async()=>{
 for(const reply of [JSON.stringify({variants_complete:false,products:[profile(8)]}),originReply([profile(8),profile(30,'United Kingdom',{ingredients:[{name:'Codeine phosphate',strength:'8 or 30 mg'}]})]),originReply([profile(8,'United Kingdom',{release:'unknown'})])]){
  const h=harness([reply]),result=await run(h);assert.equal(result.status,503);assert.equal(h.calls.length,1);
 }
});
test('unsupported strength is an explicit mismatch and a unique origin can proceed',async()=>{
 const h=harness([originReply([profile(8),profile(30)])]);assert.equal((await run(h,{...input,drugDosage:'60/500'})).data.error,'ORIGIN_STRENGTH_MISMATCH');assert.equal(h.calls.length,1);
 const single=harness([originReply([profile(30)]),candidates([])]);assert.equal((await run(single)).status,200);assert.equal(single.calls.length,2);
});
test('Preview matching cannot be activated in Production or another branch',async()=>{
 for(const settings of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'other'}]){
  const h=fixture.exports.harness(settings,[],false),response=await h.load('app/lib/production-strength-matches.ts').productionStrengthSearch(input);assert.equal(response.status,404);assert.equal(h.calls.length,0);
 }
});
test('existing translated choice UI is enabled for this Preview, with no speculative origin leaflet',()=>{
 const root=path.join(__dirname,'..'),layout=fs.readFileSync(path.join(root,'app/(discovery)/layout.tsx'),'utf8'),workspace=fs.readFileSync(path.join(root,'app/MedicineWorkspace.tsx'),'utf8');assert.match(layout,/originIdentificationMode=\{originIdentificationEnabled\(\)\|\|productionFrontendEnabled\(\)\}/);assert.match(workspace,/originIdentificationMode&&mode==='international'/);assert.match(workspace,/handleSearch\(variant\)/);assert.match(workspace,/disabled=\{loading \|\| searchFailed \|\| !!originVariants.length\}/);
});
