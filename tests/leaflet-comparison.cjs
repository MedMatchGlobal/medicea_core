const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
function harness(enabled=true,payload={status:'completed',output:[]}){
 const cache={},calls=[];function load(file){if(cache[file])return cache[file];if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));const module={exports:{}},absolute=path.join(root,file);vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,URL,Request,Response,Headers,Date,require(name){if(name.endsWith('openaiClient'))return {travelSolEnabled:()=>enabled,openaiFetch:async(url,init,options)=>{calls.push({url,body:JSON.parse(init.body),options});return Response.json(payload);}};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(absolute),name))+(name.endsWith('.json')?'':'.ts'));throw Error(name);}});return cache[file]=module.exports;}return {load,calls};
}
test('captured requests match the safeguarded 09:40 implementation and active implementation',()=>{execFileSync(process.execPath,['scripts/capture-leaflet-comparison.cjs','--check'],{cwd:root});});
test('comparison cap arms change exactly one field and never alter the fixed product or model',()=>{
 const lib=harness().load('app/lib/leaflet-comparison.ts');
 for(const [arm,base,cap]of [['0940-three-actions','0940',3],['current-one-action','current',1]]){const modified=lib.leafletComparisonRequest(arm),original=lib.leafletComparisonRequest(base);assert.equal(modified.body.max_tool_calls,cap);modified.body.max_tool_calls=original.body.max_tool_calls;assert.deepEqual(modified,original);assert.equal(JSON.parse(original.body.input[1].content).drugName,'Co Codamol');assert.equal(original.body.model,'gpt-6.1-sol');}
});
test('both validators assess the same output and report a genuine unmatched URL',()=>{
 const source='https://reference.example/product',fake='https://reference.example/not-retrieved',payload={status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:source}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({sources:[fake],information_sections:{}})}]}]};
 const value=harness().load('app/lib/leaflet-comparison.ts').assessLeafletComparison(payload);assert.equal(value.sourceChecks.historicalAccepted,false);assert.equal(value.sourceChecks.currentAccepted,false);assert.deepEqual(Array.from(value.unmatched),[fake]);assert.equal(value.structureValid,false);
 payload.output[1].content[0].text=JSON.stringify({sources:[source+'?utm_source=openai'],information_sections:{}});const drift=harness().load('app/lib/leaflet-comparison.ts').assessLeafletComparison(payload);assert.equal(drift.sourceChecks.historicalAccepted,false);assert.equal(drift.sourceChecks.currentAccepted,true);
});
test('comparison blocks non-Dev environments, foreign origins, unknown arms and arbitrary prompt inputs',async()=>{
 const url='https://preview.example/api/model-test/leaflet-comparison',request=(body,origin='https://preview.example')=>new Request(url,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const off=harness(false);assert.equal((await off.load('app/api/model-test/leaflet-comparison/route.ts').POST(request({arm:'0940'}))).status,404);assert.equal(off.calls.length,0);
 const h=harness(),route=h.load('app/api/model-test/leaflet-comparison/route.ts');for(const body of [{arm:'other'},{arm:'0940',drugName:'Private input'},{prompt:'Custom'}])assert.equal((await route.POST(request(body))).status,400);
 assert.equal((await route.POST(request({arm:'0940'},'https://foreign.example'))).status,403);assert.equal(h.calls.length,0);
 const result=await route.POST(request({arm:'0940'}));assert.equal(result.status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.singleAttempt,true);assert.equal(h.calls[0].body.max_tool_calls,1);
});
