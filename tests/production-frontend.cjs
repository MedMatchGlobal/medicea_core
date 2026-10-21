const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
// Reuse the existing immutable-Production comparison harness and all twelve fixtures.
const fixtureFile=path.join(__dirname,'active-production-prompts.cjs'),fixtureSource=fs.readFileSync(fixtureFile,'utf8'),fixtureModule={exports:{}};
vm.runInNewContext(fixtureSource.slice(0,fixtureSource.indexOf('const structuredCases'))+'\nmodule.exports={harness,cases};',{module:fixtureModule,exports:fixtureModule.exports,require:createRequire(fixtureFile),__dirname,Request,Response,Headers,URL,Buffer,AbortController,ReadableStream,TextEncoder,TextDecoder,setTimeout,clearTimeout});
const {harness,cases}=fixtureModule.exports;
const preview={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/production-prompts-new-ui',OPENAI_API_KEY:'fictional-public-test'};
for(const [label,file,input,replies] of cases)test('new frontend preserves live Production '+label+' request bodies and results',async()=>{
 const baseline=harness({VERCEL_ENV:'production',OPENAI_API_KEY:'fictional-public-test'},replies,true);
 // Even stale model-experiment flags cannot change this branch's Production engine.
 const current=harness({...preview,MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_TRAVEL_CONNECTED:'true'},replies,false);
 const request=()=>new Request('https://public-fixture.invalid/test',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(input)});
 const before=await baseline.load(file).POST(request()),after=await current.load(file).POST(request());
 const value=async response=>{const text=await response.text();try{return JSON.parse(text);}catch{return text;}};
 assert.equal(after.status,before.status);assert.deepEqual(current.calls,baseline.calls);assert.deepEqual(await value(after),await value(before));
});
test('frontend gate enables burger/library frontend without opting into experimental AI',()=>{
 const h=harness({...preview,MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_TRAVEL_CONNECTED:'true'},[],false),client=h.load('app/lib/openaiClient.ts');
 assert.equal(h.load('app/lib/travel-demo.ts').travelPreviewEnabled(),true);assert.equal(client.modelUpgradeEnabled(),false);assert.equal(client.experimentalPromptsEnabled(),false);assert.equal(client.travelSolEnabled(),false);assert.equal(client.originIdentificationEnabled(),false);
 const request={body:JSON.stringify({model:'gpt-4o',temperature:0.2,seed:12345,messages:[]})};assert.equal(client.modelUpgradeRequest(request),request);
 for(const env of [{...preview,VERCEL_ENV:'production'},{...preview,VERCEL_GIT_COMMIT_REF:'other'}])assert.equal(harness(env,[],false).load('app/lib/openaiClient.ts').productionFrontendEnabled(),false);
});
test('completed navigation, results, saved searches and session retention remain byte-identical to the frontend checkpoint',()=>{
 for(const file of ['app/MedicineWorkspace.tsx','app/components/TravelNav.tsx','app/components/TravelHeader.tsx','app/components/SavedSearches.tsx','app/lib/session-search.ts','app/lib/saved-searches.ts']){
  const before=execFileSync('git',['show','48eff0c:'+file],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'),after=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');assert.equal(after,before,file);
 }
});
