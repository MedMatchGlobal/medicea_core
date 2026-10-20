const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_TRAVEL_CONNECTED:'true',MEDICEA_OPENAI_UPGRADE:'true',OPENAI_API_KEY:'fictional-origin-test'};
function harness(settings=env,fetcher=()=>{throw Error('Unexpected provider request');}){const cache={},calls=[];function load(file){file=file.replace(/\\/g,'/');if(cache[file])return cache[file];const absolute=path.join(root,file),module={exports:{}};cache[file]=module.exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,process:{env:settings},Buffer,URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,console:{log(){},info(){},warn(){},error(){}},fetch:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return fetcher(url,init);},require(name){if(name==='next/server')return {NextResponse:{json:Response.json}};if(name==='@/lib/membership/meter')return {withMembership:h=>h};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(absolute),name))+'.ts');return require(name);}});return cache[file]=module.exports;}return {load,calls};}
const source='https://www.medicines.org.uk/emc/fictional-origin',profile={name:'Fictional product tablets 500/8/30',country:'United Kingdom',form:'tablet',route:'oral',release:'immediate release',species:[],complete:true,generic:false,ingredients:[{name:'Fictional A',strength:'500 mg per tablet'},{name:'Fictional B',strength:'8 mg per tablet'},{name:'Fictional C',strength:'30 mg per tablet'}],excipients:[],excipientStatus:'unknown',sources:[source]};
const researched=(products=[profile],urls=[source])=>({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:urls.map(url=>({url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({products})}]}]});
const destinationText='Fictional destination: Fictional A 500 mg per tablet together with Fictional B 8 mg per tablet together with Fictional C 30 mg per tablet';
const destinationReply=()=>({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://national-reference.example/destination'}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({raw_text:destinationText,sources:['https://national-reference.example/destination']})}]}]});
const completion=text=>({choices:[{finish_reason:'stop',message:{content:text}}]});
const input={drugName:'Fictional product',originCountry:'United Kingdom',targetCountry:'Italy',drugDosage:'500 + 8'};
const request=body=>new Request('https://owner-demo.invalid/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('partial and single-number hints select a subset of label amounts without dropping forgotten actives',()=>{
 const lib=harness().load('app/lib/origin-identification.ts');for(const hint of ['500','8 mg','500 + 8','8/500'])assert.equal(lib.identificationHintAgrees(hint,profile.ingredients),true);
 for(const hint of ['80','500 + 15','500 + 500','8 mcg'])assert.equal(lib.identificationHintAgrees(hint,profile.ingredients),false);
 assert.equal(lib.identificationHintAgrees('Fictional B 8 mg',profile.ingredients),null);
 const selected=lib.readIdentifiedOrigins(researched(),'United Kingdom','500 + 8');assert.equal(selected[0].ingredients.length,3);assert.equal(selected[0].ingredients[2].strength,'30 mg per tablet');assert.equal(selected[0].excipientStatus,'unknown');
 assert.equal(lib.requiresOriginChoice(selected,'Fictional B 8 mg'),true);
});

test('first-step research is source-supported Sol with a bounded single attempt and no target or leaflet request',async()=>{
 const h=harness(env,async()=>Response.json(researched())),lib=h.load('app/lib/origin-identification.ts');const products=await lib.identifyOrigin(input);assert.equal(products.length,1);assert.equal(h.calls.length,1);const call=h.calls[0];assert.match(call.url,/responses$/);assert.equal(call.body.model,'gpt-6.1-sol');assert.equal(call.body.max_tool_calls,1);assert.equal(call.body.text.format.strict,true);assert.equal(call.body.store,false);assert.match(call.body.instructions,/Retrieve ALL active ingredients/);assert.match(call.body.instructions,/Never overwrite a label strength/);assert.match(call.body.instructions,/No destination products/);assert.deepEqual(call.body.include,['web_search_call.action.sources']);
});

test('ambiguous shared strength returns choices before destination search; choosing reuses the complete signed profile',async()=>{
 const other={...profile,name:'Fictional product tablets 500/30',ingredients:profile.ingredients.slice(0,2).map((i,n)=>n?{...i,strength:'30 mg per tablet'}:i)};
 const h=harness(env,async(url,init)=>Response.json(JSON.parse(init.body).text.format.name==='medicea_origin_identification_v1'?researched([profile,other]):destinationReply())),route=h.load('app/api/openai/equivalent-search/route.ts');
 const first=await route.POST(request({...input,drugDosage:'500'}));assert.equal(first.status,409);const data=await first.json();assert.equal(data.variants.length,2);assert.equal(h.calls.length,1);assert.equal(data.variants[0].excipients.length,0);assert.equal(data.variants[0].release,'immediate release');
 const chosen=await route.POST(request({...input,drugDosage:'500',originSelection:data.variants[0].token}));assert.equal(chosen.status,200);const result=await chosen.json();assert.equal(h.calls.length,2);assert.equal(result.originProfile.active_ingredients.length,3);assert.equal(result.originProfile.identification,'origin-v1');assert.match(h.calls[1].body.input,/8 mg per tablet of Fictional B/);assert.match(h.calls[1].body.input,/30 mg per tablet of Fictional C/);assert.equal(result.originProfile.excipientStatus,'unknown');
});

test('no matching source profile, invalid token and provider failures never reach destination search',async()=>{
 for(const products of [[],[{...profile,country:'France'}],[{...profile,complete:false}],[{...profile,sources:['https://unretrieved.example/leaflet']}],[{...profile,species:['dog']}],[{...profile,excipientStatus:'unknown',excipients:['Invented absent-list claim']}]] ){
  const h=harness(env,async()=>Response.json(researched(products))),r=await h.load('app/api/openai/equivalent-search/route.ts').POST(request(input));assert.equal(r.status,422);assert.equal(h.calls.length,1);
 }
 const no=harness(),route=no.load('app/api/openai/equivalent-search/route.ts');assert.equal((await route.POST(request({...input,originSelection:'tampered'}))).status,422);assert.equal(no.calls.length,0);
 const failed=harness({...env,OPENAI_API_KEY_1:'other-fictional-key'},async()=>{throw Error('Fixture failure');});assert.equal((await failed.load('app/api/openai/equivalent-search/route.ts').POST(request(input))).status,503);assert.equal(failed.calls.length,1);
});

test('sourced excipients and distinct release types survive signing and source URLs cannot be invented',()=>{
 const h=harness(),lib=h.load('app/lib/origin-identification.ts');const p={...profile,excipients:['Fictional excipient'],excipientStatus:'partial'},other={...p,release:'modified release'};
 const products=lib.readIdentifiedOrigins(researched([p,other]),'United Kingdom','');assert.equal(products.length,2);const signer=h.load('app/lib/origin-lookup.ts'),token=signer.issueOriginSelection(products[0],input.drugName),restored=signer.readOriginSelection(token,input.drugName,'United Kingdom','500 + 8');assert.equal(restored.excipientStatus,'partial');assert.equal(restored.excipients[0],'Fictional excipient');
 assert.equal(lib.readIdentifiedOrigins(researched([{...p,sources:['https://www.medicines.org.uk/not-retrieved']}]),'United Kingdom','').length,0);
 const italy={...profile,country:'Italy',sources:['https://www.spididol.it/fictional-leaflet']};assert.equal(lib.readIdentifiedOrigins(researched([italy],italy.sources),'Italy','').length,1);
});

test('identification remains disabled outside the owner Dev deployment and in legacy evaluation arms',async()=>{
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'other'},{MEDICEA_ORIGIN_IDENTIFICATION:'false'}]){const h=harness({...env,...patch});await assert.rejects(()=>h.load('app/lib/origin-identification.ts').identifyOrigin(input),/DISABLED/);assert.equal(h.calls.length,0);}
 const h=harness(),client=h.load('app/lib/openaiClient.ts');assert.equal(client.originIdentificationEnabled(),true);const result=await client.withOpenAIEvaluation(true,async()=>client.originIdentificationEnabled());assert.equal(result.value,false);assert.equal(client.originIdentificationEnabled(),true);
});

test('Travel lookup and comparison use the new original profile without rediscovering it or overwriting strengths',async()=>{
 const h=harness(env,async(url,init)=>Response.json(JSON.parse(init.body).text.format.name==='medicea_origin_identification_v1'?researched():destinationReply())),travel=h.load('app/lib/travel-original-search.ts');const products=await travel.originalTravelOrigin(input.drugName,input.originCountry,input.drugDosage);assert.equal(products[0].identification,'origin-v1');const token=h.load('app/lib/origin-lookup.ts').issueOriginSelection(products[0],input.drugName);const response=await travel.originalTravelCompare(input.drugName,input.originCountry,'Italy',input.drugDosage,token);assert.equal(response.status,200);assert.equal(h.calls.length,2);assert.equal((await response.json()).product.ingredients.length,3);
});


test('origin details survive Travel saving and unknown excipients are not recorded as a confirmed empty list',()=>{
 const h=harness(),lib=h.load('app/lib/origin-identification.ts'),clean=h.load('app/lib/travel-connected.ts').cleanTravelProduct;
 for(const patch of [{excipientStatus:'unknown',excipients:[]},{excipientStatus:'partial',excipients:['Fictional excipient']}]){
  const origin=lib.readIdentifiedOrigins(researched([{...profile,...patch}]),'United Kingdom','500 + 8')[0],saved=clean({...origin,query:input.drugName,dosage:input.drugDosage});assert.equal(saved.identification,'origin-v1');assert.equal(saved.release,origin.release);assert.equal(saved.excipientStatus,patch.excipientStatus);assert.deepEqual(Array.from(saved.excipients),patch.excipients);
 }
});

test('Belgium identification searches web-wide without altering rollback country coverage',async()=>{
 const source='https://app.fagg-afmps.be/pharma-status/api/files/fictional-fixture',belgian={...profile,country:'Belgium',sources:[source]};
 const h=harness(env,async()=>Response.json(researched([belgian],[source]))),lib=h.load('app/lib/origin-identification.ts');
 const products=await lib.identifyOrigin({...input,originCountry:'Belgium'});assert.equal(products.length,1);assert.equal(h.calls.length,1);assert.equal(h.calls[0].body.tools[0].filters,undefined);assert.match(h.calls[0].body.instructions,/national medicines regulator/);assert.equal(h.load('app/lib/origin-lookup.ts').originSourceDomains('Belgium').length,0);
});
const leafletTopics=['Active Ingredients','Strength','Formulation','Indications','Contraindications','Precautions','Side Effects','Interactions','Legal Classification','Manufacturer','Average Selling Price'];
const leafletFixture=()=>({information_sections:Object.fromEntries(leafletTopics.map(k=>[k,k==='Average Selling Price'?[]:['Fictional '+k+' information']])),sources:['https://app.fagg-afmps.be/pharma-status/api/files/fictional-fixture']});
function researchedLeaflet(value){return {status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://app.fagg-afmps.be/pharma-status/api/files/fictional-fixture'}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]};}
test('Belgian standalone leaflet researches its existing generation once, publishes before price, and preserves the approved prompt',async()=>{
 const h=harness(env,async(url,init)=>{const body=JSON.parse(init.body);if(body.text.format.name==='medicea_grounded_leaflet_v1')return Response.json(researchedLeaflet(leafletFixture()));return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"quotes":[]}'}]}]});});
 let ready;const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional Belgian medicine',originCountry:'Belgium',lang:'en'},'human',r=>ready=r),result=await response.json();
 assert.equal(response.status,200);assert.equal(result.sections.length,11);assert.equal(result.sources.length,1);assert.equal(ready.pricePending,true);assert.equal(h.calls.length,2);assert.match(h.calls[0].url,/responses$/);assert.equal(h.calls[0].body.max_tool_calls,3);assert.equal(h.calls[0].body.store,false);assert.equal(h.calls[0].body.text.format.strict,true);assert.equal(h.calls[0].body.instructions,h.load('app/lib/leaflet-prompts.ts').organisedHumanLeafletPrompt('English'));assert.equal(h.calls[1].body.text.format.name,'medicea_price_quotes_v1');assert.equal(result.verification,'ai_generated_unverified');
});
test('leaflet source failures and missing identity or contraindications never publish a priced shell or silently retry',async()=>{
 const invalid=[{...leafletFixture(),sources:[]},{...leafletFixture(),sources:['https://app.fagg-afmps.be/not-retrieved']},{...leafletFixture(),sources:['https://pharmacy.example/retail-price']}];
 for(const key of ['Active Ingredients','Strength','Formulation','Indications','Contraindications']){const p=leafletFixture();p.information_sections[key]=[];invalid.push(p);}
 for(const value of invalid){const h=harness(env,async()=>Response.json(researchedLeaflet(value)));let published=false;const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional Belgian medicine',originCountry:'Belgium'},'human',()=>published=true);assert.equal(response.status,503);assert.equal(h.calls.length,1);assert.equal(published,false);}
 const failure=harness({...env,OPENAI_API_KEY_1:'fictional-other'},async()=>{throw Error('Mock unavailable');});assert.equal((await failure.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional Belgian medicine',originCountry:'Belgium'})).status,503);assert.equal(failure.calls.length,1);
});
test('source research keeps the selected original product and can be disabled independently',async()=>{
 const source='https://app.fagg-afmps.be/pharma-status/api/files/fictional-fixture',belgian={...profile,country:'Belgium',sources:[source]};
 const h=harness(env,async()=>Response.json(researchedLeaflet(leafletFixture()))),signer=h.load('app/lib/origin-lookup.ts'),token=signer.issueOriginSelection(belgian,input.drugName);
 const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:input.drugName,originCountry:'Belgium',originSelection:token});assert.equal(response.status,200);const task=JSON.parse(h.calls[0].body.input[1].content);assert.equal(task.selectedProfile.ingredients.length,3);assert.equal(task.selectedProfile.sources[0],source);
 const old=harness({...env,MEDICEA_GROUNDED_LEAFLET:'false'},async()=>Response.json(completion(JSON.stringify({information_sections:leafletFixture().information_sections}))));assert.equal((await old.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional Belgian medicine',originCountry:'Belgium'})).status,200);assert.match(old.calls[0].url,/chat\/completions$/);
});

test('countries and source websites absent from the old registry work for both origin and destination research',async()=>{
 const foreignSource='https://manufacturer-worldwide.example/singapore/product',p={...profile,country:'Singapore',sources:[foreignSource]};
 const h=harness(env,async(url,init)=>Response.json(JSON.parse(init.body).text.format.name==='medicea_origin_identification_v1'?researched([p],[foreignSource]):destinationReply()));
 const response=await h.load('app/api/openai/equivalent-search/route.ts').POST(request({...input,originCountry:'Singapore',targetCountry:'Chile'})),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,2);assert.equal(data.originProfile.origin_country,'Singapore');assert.equal(data.equivalentResults.target_country,'Chile');assert.equal(data.equivalentResults.source_policy,'worldwide-country-authority-v1');assert.equal(data.equivalentResults.sources[0],'https://national-reference.example/destination');
 for(const call of h.calls){assert.match(call.url,/responses$/);assert.equal(call.body.tools[0].filters,undefined);assert.match(call.body.instructions,/authoritative and reliable/);assert.match(call.body.instructions,/requested country/);}
 const destinationTask=JSON.parse(h.calls[1].body.input);assert.equal(destinationTask.targetCountry,'Chile');assert.equal(destinationTask.originProfile.country,'Singapore');assert.equal(destinationTask.originProfile.ingredients.length,3);assert.match(h.calls[1].body.instructions,/research destination products only/);
 const lib=h.load('app/lib/origin-identification.ts');assert.equal(lib.readIdentifiedOrigins(researched([p],[]),'Singapore','').length,0);assert.equal(lib.readIdentifiedOrigins(researched([{...p,country:'Malaysia'}],[foreignSource]),'Singapore','').length,0);
});
test('leaflets research a country and website not on any predefined list and retain the approved section prompt',async()=>{
 const p=leafletFixture(),newSource='https://official-reference.example/sri-lanka/fixture';p.sources=[newSource];
 const result=researchedLeaflet(p);result.output[0].action.sources=[{url:newSource}];
 const h=harness(env,async(url,init)=>Response.json(JSON.parse(init.body).text.format.name==='medicea_grounded_leaflet_v1'?result:{status:'completed',output:[]}));
 const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional product',originCountry:'Sri Lanka'}),data=await response.json();assert.equal(response.status,200);assert.equal(data.sources[0],newSource);assert.equal(h.calls[0].body.tools[0].filters,undefined);assert.match(h.calls[0].body.input[0].content,/authoritative and reliable/);assert.equal(JSON.parse(h.calls[0].body.input[1].content).originCountry,'Sri Lanka');
});
test('destination source URLs must have been retrieved; failures do not fall back to a memory-only list',async()=>{
 const invalid=destinationReply();invalid.output[1].content[0].text=JSON.stringify({raw_text:destinationText,sources:['https://invented.example/not-retrieved']});
 const h=harness(env,async()=>Response.json(invalid));await assert.rejects(()=>h.load('app/lib/equivalent-research.ts').researchEquivalentList('Existing list instruction','Existing query',profile,'Chile'),/UNSUPPORTED_EQUIVALENT_SOURCES/);assert.equal(h.calls.length,1);
});

test('equivalent leaflet route sends the retained supplier identity while search access remains bound to the original result',async()=>{
 const original='Co-codamol 30/500 Effervescent Tablets — Zentiva, United Kingdom. Each tablet contains fictional fixture information. [Product information](https://www.medicines.org.uk/emc/fictional-fixture/smpc)';
 const value=leafletFixture();
 const h=harness({...env,STRIPE_WEBHOOK_SECRET:'whsec_fixture'},async(url,init)=>Response.json(JSON.parse(init.body).text.format.name==='medicea_grounded_leaflet_v1'?researchedLeaflet(value):{status:'completed',output:[]}));
 const grants=h.load('lib/membership/search-grant.ts'),grant=grants.issueSearchGrant('fixture-owner',{mode:'international',originCountry:'Italy',targetCountry:'United Kingdom'},{matches:[{medicine_name:original}]});
 const body={drugName:original,equivalentResult:original,originCountry:'United Kingdom',lang:'en',searchAccess:grant};
 assert.equal(grants.allowsSearchFollowup(grant,'fixture-owner','leaflet',body),true);
 assert.equal(grants.allowsSearchFollowup(grant,'fixture-owner','leaflet',{...body,drugName:'Unrelated medicine'}),false);
 const response=await h.load('app/api/openai/leaflet/route.ts').POST(request(body));assert.equal(response.status,200);const task=JSON.parse(h.calls[0].body.input[1].content);assert.equal(task.drugName,'Co-codamol 30/500 Effervescent Tablets — Zentiva');assert.equal(task.originCountry,'United Kingdom');assert.equal(task.equivalentResult,original);assert.equal(task.selectedProfile,null);assert.equal(h.calls[0].body.instructions,h.load('app/lib/leaflet-prompts.ts').organisedHumanLeafletPrompt('English'));
});

 test('missing required leaflet sections are reported by name without publishing incomplete content',async()=>{
  for(const key of ['Active Ingredients','Strength','Formulation','Indications','Contraindications']){
   const value=leafletFixture();value.information_sections[key]=[];
   const h=harness(env,async()=>Response.json(researchedLeaflet(value)));let published=false;
   const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional exact product',originCountry:'Belgium'},'human',()=>published=true),data=await response.json();
   assert.equal(response.status,503);assert.equal(data.diagnosticCode,'UNCONFIRMED_LEAFLET_PRODUCT');assert.deepEqual(data.missingSections,[key]);assert.equal(data.leaflet,undefined);assert.equal(published,false);assert.equal(h.calls.length,1);
  }
 });
 test('unmatched equivalent context cannot be attached to a different leaflet request',async()=>{
  const h=harness(env,async()=>Response.json(researchedLeaflet(leafletFixture())));
  const response=await h.load('app/api/openai/leaflet/route.ts').POST(request({drugName:'Fictional product',equivalentResult:'Different fictional product — Company, United Kingdom. https://example.com/',originCountry:'United Kingdom',lang:'en'}));
  assert.equal(response.status,200);const task=JSON.parse(h.calls[0].body.input[1].content);assert.equal(task.equivalentResult,undefined);
 });

 test('three-action leaflet research accepts completed page sources within the same generation',async()=>{
  const page='https://product-reference.example/country/fictional-product',value=leafletFixture();value.sources=[page];value.information_sections['Average Selling Price']=['Fictional indicative price'];
  const payload=researchedLeaflet(value);payload.output.splice(1,0,{type:'web_search_call',status:'completed',action:{type:'open_page',url:page}},{type:'web_search_call',status:'completed',action:{type:'find_in_page',url:page,pattern:'Fictional section'}});
  const h=harness(env,async()=>Response.json(payload)),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({drugName:'Fictional product',originCountry:'Belgium'}),data=await response.json();
  assert.equal(response.status,200);assert.deepEqual(data.sources,[page]);assert.equal(data.sections.length,11);assert.equal(h.calls.length,1);assert.equal(h.calls[0].body.max_tool_calls,3);assert.equal(h.calls[0].body.model,'gpt-6.1-sol');assert.equal(h.calls[0].body.tools[0].filters,undefined);assert.equal(h.calls[0].body.instructions,h.load('app/lib/leaflet-prompts.ts').organisedHumanLeafletPrompt('English'));
 });
 test('opened-page provenance rejects incomplete calls and unsafe links without changing other research consumers',()=>{
  const lib=harness().load('app/lib/research-sources.ts'),page='https://new-country-reference.example/product';
  const payload={output:[{type:'web_search_call',status:'completed',action:{type:'open_page',url:page}},{type:'web_search_call',status:'completed',action:{type:'find_in_page',url:page}},{type:'web_search_call',status:'in_progress',action:{type:'open_page',url:'https://not-finished.example/'}},{type:'web_search_call',status:'completed',action:{type:'open_page',url:'javascript:alert(1)'}},{type:'message',status:'completed',action:{type:'open_page',url:'https://not-a-tool.example/'}},{type:'web_search_call',status:'completed',action:{type:'open_page',url:'https://user:secret@credentialed.example/'}}]};
  assert.equal(lib.retrievedResearchUrls(payload).size,0);assert.deepEqual(Array.from(lib.retrievedResearchUrls(payload,true)),[page]);
 });

 test('Italy-to-UK equivalent pricing uses the UK while the Italian original uses Italy',async()=>{
  for(const productCountry of ['United Kingdom','Italy']){
   const original='Fictional exact product tablets — Fictional Supplier, '+productCountry+'. Fictional formulation details.';
   const value=leafletFixture(),quote={product:'Fictional exact product tablets',pack:'20 tablets',price:'8.50',currency:productCountry==='Italy'?'EUR':'GBP',country:productCountry,source:'https://licensed-pharmacy.example/fictional-pack',note:'Listed pack price, not a guaranteed checkout price'};
   const h=harness(env,async(url,init)=>{const body=JSON.parse(init.body);if(body.text.format.name==='medicea_grounded_leaflet_v1')return Response.json(researchedLeaflet(value));return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:[{url:quote.source}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({quotes:[quote]})}]}]});});
   const response=await h.load('app/api/openai/leaflet/route.ts').POST(request({drugName:original,equivalentResult:original,originCountry:productCountry,targetCountry:productCountry,lang:'en'})),data=await response.json();
   assert.equal(response.status,200);assert.equal(h.calls.length,2);assert.equal(JSON.parse(h.calls[0].body.input[1].content).originCountry,productCountry);assert.equal(JSON.parse(h.calls[1].body.input).originCountry,productCountry);assert.equal(h.calls[0].body.max_tool_calls,3);assert.equal(h.calls[1].body.max_tool_calls,1);assert.equal(data.priceLookupDiagnostic,'PRICE_FOUND');assert.match(data.sections.at(-1).bullets[0],new RegExp(productCountry));
  }
 });
