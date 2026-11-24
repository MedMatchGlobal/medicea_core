const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'fictional-test-key'};
function loader(overrides={}){const cache={};return function read(file){file=path.resolve(file);if(cache[file])return cache[file];const module={exports:{}};cache[file]=module.exports;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,process:{env},Request,Response,Headers,URL,Buffer,Date,Error,ReadableStream,TextEncoder,TextDecoder,AbortController,console,setTimeout,clearTimeout,require:name=>overrides[name]||(name.startsWith('@/')?read(name.slice(2)+'.ts'):name.startsWith('.')?read(path.resolve(path.dirname(file),name)+'.ts'):require(name))});return cache[file]=module.exports;};}
const product=(strength='25 mg',form='tablet')=>({name:'Fictional origin '+strength+' '+form,country:'Italy',form,route:'oral',release:'immediate-release',species:[],complete:true,generic:false,ingredients:[{name:'FictionalActive',strength}],sources:['https://regulator.example/product'],lookup:'original'});
test('one known origin still requires confirmation and never starts destination discovery',async()=>{
 let calls=0;const read=loader({'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>{calls++;return {variants_complete:true,products:[product()]};}}});
 const search=read('app/lib/sonnet-research-matches.ts').productionStrengthSearch;
 const choice=await search({drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan',drugDosage:'25 mg'},true),body=await choice.json();
 assert.equal(body.requiresChoice,true);assert.equal(body.variants.length,1);assert.ok(body.variants[0].token);
 const direct=await search({drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan',drugDosage:'25 mg'});
 assert.equal(direct.status,409);assert.equal((await direct.json()).error,'CHOOSE_ORIGIN_VARIANT');assert.equal(calls,2);
});
test('strength narrows choices without losing forms; unknown strength never silently substitutes',async()=>{
 const read=loader({'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>({variants_complete:true,products:[product(),product('25 mg','capsule'),product('125 mg')]})}});
 const search=read('app/lib/sonnet-research-matches.ts').productionStrengthSearch;
 const input={drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan',drugDosage:'25 mg'};
 const choice=await (await search(input,true)).json();assert.equal(choice.variants.length,2);assert.deepEqual([...choice.variants.map(p=>p.form)],['tablet','capsule']);
 const mismatch=await search({...input,drugDosage:'2 mg'},true);assert.equal(mismatch.status,422);assert.equal((await mismatch.json()).error,'ORIGIN_STRENGTH_MISMATCH');
});
test('unconfirmed release never becomes selectable and does not hide another fully supported presentation',async()=>{
 let products=[{...product(),release:'unknown'}];
 const read=loader({'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>({variants_complete:false,products})}});
 const search=read('app/lib/sonnet-research-matches.ts').productionStrengthSearch,input={drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan'};
 const stopped=await search(input,true);assert.equal(stopped.status,422);assert.equal((await stopped.json()).error,'ORIGIN_DETAILS_UNCONFIRMED');
 products=[product(),{...product('125 mg'),release:'unknown'}];
 const choice=await (await search(input,true)).json();assert.equal(choice.variants.length,1);assert.equal(choice.requiresChoice,true);assert.equal(choice.unconfirmedVariants.length,1);assert.equal(choice.variants[0].release,'immediate-release');
});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function streamRuntime(allowed=true){const log=[];let read;
 const overrides={
  './config':{membershipPreviewEnabled:()=>true,sameOrigin:()=>true},
  './auth':{membershipUser:async()=>allowed?{id:'member',email:'fixture@example.test'}:null},
  './store':{reserve:async()=>{log.push('reserve');return {allowed:true};},finish:async(member,id,successful)=>log.push('finish:'+successful)},
  './access-policy':{operationModule:async()=> 'medicine'},
  './search-grant':{searchGrantConfigured(){},issueSearchGrant:()=>{log.push('grant');return 'signed-fixture-grant';}},
 };
 read=loader(overrides);return {read,log};
}
const successfulMatches=()=>({originProfile:{active_ingredients:[{name:'FictionalActive',strength:'25 mg'}]},equivalentResults:{raw_text:'Fictional candidate'},matches:[{medicine_name:'Fictional candidate'}]});
const request=()=>new Request('https://preview.example/api',{method:'POST',headers:{origin:'https://preview.example'},body:JSON.stringify({mode:'international',drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan'})});
test('leaflet streams before slow matches; one metered reservation settles before final grant',async()=>{
 const {read,log}=streamRuntime(),gate=deferred(),seen=[];
 const response=read('lib/membership/progressive-search.ts').progressiveSearch(request(),(req,emit)=>{
  const completed=Promise.resolve().then(()=>emit({type:'leaflet',status:200,data:{leaflet:{leaflet_text:'Fictional summary'}}}));
  return {completed,result:gate.promise};
 });
 const done=read('app/lib/search-progress.ts').readSearchProgress(response,event=>seen.push(event));
 await new Promise(r=>setTimeout(r,10));assert.equal(seen[0].type,'leaflet');assert.deepEqual(log,['reserve']);
 gate.resolve(Response.json(successfulMatches()));await done;
 assert.deepEqual(log,['reserve','finish:true','grant']);assert.equal(seen[1].data.searchAccess,'signed-fixture-grant');assert.equal(seen.length,2);
});
test('matches stream before a slow leaflet and leaflet failure does not undo them',async()=>{
 const {read,log}=streamRuntime(),gate=deferred(),seen=[];
 const response=read('lib/membership/progressive-search.ts').progressiveSearch(request(),(req,emit)=>({result:Promise.resolve(Response.json(successfulMatches())),completed:gate.promise.then(()=>emit({type:'leaflet',status:503,data:{error:'LEAFLET_UNAVAILABLE'}}))}));
 const done=read('app/lib/search-progress.ts').readSearchProgress(response,event=>seen.push(event));
 await new Promise(r=>setTimeout(r,10));assert.equal(seen[0].type,'result');assert.equal(seen[0].status,200);assert.deepEqual(log,['reserve','finish:true','grant']);
 gate.resolve();await done;assert.equal(seen[1].type,'leaflet');assert.equal(seen[1].status,503);assert.equal(log.filter(x=>x==='reserve').length,1);
});
test('authorization failure starts no providers and makes no reservation',async()=>{
 const {read,log}=streamRuntime(false);let providers=0;const seen=[];
 const response=read('lib/membership/progressive-search.ts').progressiveSearch(request(),()=>{providers++;throw Error('Must not run');});
 const final=await read('app/lib/search-progress.ts').readSearchProgress(response,e=>seen.push(e));
 assert.equal(final.status,401);assert.equal(final.data.membershipAccess,true);assert.equal(providers,0);assert.deepEqual(log,[]);assert.equal(seen.length,1);
});
test('matching failure releases usage but retains an independently completed leaflet',async()=>{
 const {read,log}=streamRuntime(),seen=[];
 const response=read('lib/membership/progressive-search.ts').progressiveSearch(request(),(req,emit)=>({result:Promise.resolve(Response.json({error:'MATCHING_UNAVAILABLE'},{status:503})),completed:Promise.resolve().then(()=>emit({type:'leaflet',status:200,data:{leaflet:{leaflet_text:'Fictional summary'}}}))}));
 const result=await read('app/lib/search-progress.ts').readSearchProgress(response,e=>seen.push(e));
 assert.equal(result.status,503);assert.ok(seen.some(e=>e.type==='leaflet'&&e.status===200));assert.deepEqual(log,['reserve','finish:false']);
});
test('progress decoder preserves UTF-8 and JSON across arbitrary network boundaries',async()=>{
 const read=loader(),encoder=new TextEncoder(),seen=[];
 const bytes=encoder.encode(JSON.stringify({type:'leaflet',status:200,data:{text:'medicéa 日本'}})+'\n'+JSON.stringify({type:'result',status:200,data:{matches:[]}}));
 const response=new Response(new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}}));
 const result=await read('app/lib/search-progress.ts').readSearchProgress(response,e=>seen.push(e));assert.equal(seen[0].data.text,'medicéa 日本');assert.equal(result.type,'result');
});
test('leaflet headings support indicative pricing and keep links below safety bullets',()=>{
 const read=loader(),view=read('app/lib/readable-leaflet.ts').parseReadableLeaflet('Warnings:\n- Fictional warning [Official leaflet](https://regulator.example/pil).\nHow to Use:\n- Read the exact product label.\nIndicative Retail Price:\nObserved retail price £5 for 20 tablets.\nSources:\nhttps://regulator.example/pil');
 assert.match(view.sections[0].text,/Fictional warning/);assert.doesNotMatch(JSON.stringify(view.sections),/https:\/\//);assert.equal(view.sources.length,1);assert.match(view.price,/Observed retail price/);assert.ok(view.sections.some(s=>s.key==='How to Use'));
});
test('actual compound route shares one authorization across parallel handlers and refuses unselected work',async()=>{
 const log=[],events=[],gate=deferred();let read,leafletCalls=0,matchingCalls=0;
 const selected={...product(),token:'selected-fixture'};
 const overrides={
  './config':{membershipPreviewEnabled:()=>true,sameOrigin:()=>true},'./auth':{membershipUser:async()=>({id:'member',email:'fixture@example.test'})},
  './store':{reserve:async()=>{log.push('reserve');return {allowed:true};},finish:async(member,id,successful)=>log.push('finish:'+successful)},
  './access-policy':{operationModule:async()=> 'medicine'},'./search-grant':{searchGrantConfigured(){},issueSearchGrant:()=> 'fixture-grant'},
  '@/app/lib/claude-preview':{claudePreviewEnabled:()=>true},'@/app/lib/origin-variants':{readVariant:token=>token==='selected-fixture'?selected:null},
  '@/app/api/openai/leaflet/route':{POST:request=>read('lib/membership/meter.ts').withMembership(async()=>{leafletCalls++;return Response.json({leaflet:{leaflet_text:'Fictional selected summary'}});},'leaflet')(request)},
  '@/app/api/openai/equivalent-search/route':{POST:request=>read('lib/membership/meter.ts').withMembership(async()=>{matchingCalls++;await gate.promise;return Response.json(successfulMatches());},'matches')(request)},
 };read=loader(overrides);
 const invoke=token=>read('app/api/membership/search/route.ts').POST(new Request('https://preview.example/api',{method:'POST',headers:{origin:'https://preview.example'},body:JSON.stringify({stream:true,mode:'international',drugName:'Fictional origin',originCountry:'Italy',targetCountry:'Japan',originSelection:token})}));
 const response=await invoke('selected-fixture'),done=read('app/lib/search-progress.ts').readSearchProgress(response,e=>events.push(e));
 await new Promise(r=>setTimeout(r,15));assert.equal(leafletCalls,1);assert.equal(matchingCalls,1);assert.equal(events[0].type,'leaflet');assert.deepEqual(log,['reserve']);
 gate.resolve();await done;assert.deepEqual(log,['reserve','finish:true']);
 const invalid=await read('app/lib/search-progress.ts').readSearchProgress(await invoke('wrong-fixture'),()=>{});
 assert.equal(invalid.status,422);assert.equal(leafletCalls,1);assert.equal(matchingCalls,1);assert.deepEqual(log,['reserve','finish:true','reserve','finish:false']);
});
