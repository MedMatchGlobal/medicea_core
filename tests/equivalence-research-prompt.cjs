const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'};
function loader(fetch){const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch,Response,Request,Headers,AbortController,URL,Buffer,Date,Error,SyntaxError,TypeError,setTimeout,clearTimeout,console,require:name=>name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name)});return cache[file]=module.exports;};}
const source='https://regulator.example/product';
const origin={name:'Example origin 500/30 film-coated tablets',country:'Italy',form:'film-coated tablet',route:'oral',release:'immediate-release',species:[],complete:true,generic:false,ingredients:[{name:'Substance A',strength:'500 mg per tablet'},{name:'Substance B',strength:'30 mg per tablet'}],sources:[source],lookup:'original',private_extra:'secret-context'};
function reply(value){return Response.json({stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:source}]},{type:'text',text:JSON.stringify(value)}]});}

test('actual request replaces destination prompt layers, preserves selected route, verifies research and retains statuses',async()=>{
 let calls=0;
 const candidate={...origin,name:'Example destination 500/30 tablets',country:'Belgium',market_status:'listed_as_marketed',legal_status:'prescription-only',labelling_differences:['Different coating declared by the product source.']};
 const read=loader(async(url,init)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');
  const body=JSON.parse(init.body),data=JSON.parse(body.messages[0].content);calls++;
  assert.equal(body.model,'claude-sonnet-5-5');assert.equal(body.output_config.effort,'medium');assert.equal(body.tools[0].name,'web_search');
  assert.match(body.system,/Search before answering; never answer from memory/);
  assert.match(body.system,/Prioritize official destination-country medicines registries/);
  assert.match(body.system,/do not claim stock availability/);
  assert.match(body.system,/Unknown form, route or release must remain unknown/);
  for(const old of ['A product has name (include labelled strength and formulation)','Retrieve known HUMAN medicines','For each generic-name query, explicitly search','Use release "immediate-release" for known conventional release','For price requests'])assert.ok(!body.system.includes(old),old);
  if(calls===1){
   assert.equal(body.system,read('app/lib/equivalence-research-prompt.ts').equivalenceDiscoveryInstruction('Italy','Belgium'));
   assert.deepEqual(data.source_product,{name:origin.name,country:'Italy',actives_and_strengths:origin.ingredients,form:'film-coated tablet',route:'oral',release:'immediate-release',sources:[source]});
   assert.equal(data.target_country,'Belgium');assert.doesNotMatch(JSON.stringify(data),/secret-context|selection_token/);
   return reply({candidates:[candidate]});
  }
  assert.equal(body.system,read('app/lib/equivalence-research-prompt.ts').equivalenceCatalogueInstruction);
  const wrongStrength={...candidate,ingredients:[candidate.ingredients[0],{...candidate.ingredients[1],strength:'8 mg per tablet'}]};
  return reply({catalogues:[{query_name:data.query_names[0],variants_complete:false,products:[candidate,wrongStrength,{...candidate,form:'effervescent tablet'},{...candidate,route:'rectal'},{...candidate,release:'modified-release'},{...candidate,ingredients:[candidate.ingredients[0]]}]}]});
 });
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(origin,'Example');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Belgium',originSelection:token},false,true);
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(body.matches.length,1);
 assert.equal(body.matches[0].marketStatus,'listed_as_marketed');assert.equal(body.matches[0].legalStatus,'prescription-only');assert.equal(body.matches[0].labellingDifferences.length,1);
 for(const reason of ['STRENGTH_OR_UNIT_TEXT_DIFFERS','FORM_MISMATCH','ROUTE_MISMATCH','RELEASE_MISMATCH','INGREDIENT_NAMES_MISMATCH'])assert.ok(body.equivalentDebug.decisions.some(d=>d.reasons.includes(reason)),reason);
});

test('a memory-only reply is unavailable rather than a confirmed no-match result, with no retry',async()=>{
 let calls=0;const read=loader(async()=>{calls++;return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"candidates":[]}'}]});});
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(origin,'Example');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Belgium',originSelection:token},false,true);
 const body=await response.json();assert.equal(response.status,503);assert.equal(body.diagnostic,'CLAUDE_NO_RESEARCH');assert.equal(body.matches,undefined);assert.equal(calls,1);
});

test('country-independent prompt and bounded result metadata preserve unknowns and saved statuses',()=>{
 const read=loader(()=>{throw Error('No network');}),prompts=read('app/lib/equivalence-research-prompt.ts');
 const instruction=prompts.equivalenceDiscoveryInstruction('Belgium','Japan');assert.match(instruction,/"Japan"/);assert.doesNotMatch(instruction,/NHS|MHRA|United Kingdom/);
 const invalid=prompts.equivalentResearchMetadata({market_status:'in-stock',legal_status:'OTC',labelling_differences:['<unsafe>','x'.repeat(301)]});
 assert.equal(invalid.marketStatus,'unverified');assert.equal(invalid.legalStatus,'unverified');assert.equal(invalid.labellingDifferences.length,0);
 const saved=read('app/lib/saved-searches.ts').normalizeSavedSearch({id:'test',savedAt:'2026-11-13T12:00:00Z',mode:'international',selectedDrug:'Example',originCode:'Italy',targetCode:'Japan',matches:[{medicine_name:'Example destination',marketStatus:'discontinued',legalStatus:'pharmacy-only',labellingDifferences:['Different declared coating.']} ]});
 assert.equal(saved.matches[0].marketStatus,'discontinued');assert.equal(saved.matches[0].legalStatus,'pharmacy-only');assert.equal(saved.matches[0].labellingDifferences.length,1);
});
