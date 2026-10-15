const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(name,client={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,process:{env:{}},URL,Response,AbortController,setTimeout,clearTimeout,require:()=>client});return module.exports;}
const sourced=load('source-matches');
const ingredient=(name,strength)=>({name,strength});
const origin={name:'Origin',country:'United Kingdom',complete:true,generic:false,form:'tablet',route:'oral',species:[],ingredients:[ingredient('Paracetamol','500 mg/tablet'),ingredient('Codeine phosphate','8 mg/tablet')],sources:['https://www.medicines.org.uk/emc/product/fixture']};
const candidate={...origin,name:'Candidate',country:'Ireland',sources:['https://www.hpra.ie/fixture']};
test('UK co-codamol 8/500 never accepts Italian Co Efferalgan 500/30, in either direction',()=>{
 const uk={...origin,name:'Co-codamol 8/500 tablets'};
 const italy={...origin,name:'Co Efferalgan 500 mg + 30 mg tablets',country:'Italy',ingredients:[ingredient('Paracetamol','500 mg/tablet'),ingredient('Codeine phosphate','30 mg/tablet')],sources:['https://www.aifa.gov.it/fixture']};
 assert.equal(sourced.exactComposition(uk,italy),false);
 assert.equal(sourced.exactComposition(italy,uk),false);
 const rejected=sourced.readSourcedMatches(response([italy],[...uk.sources,...italy.sources],uk),'United Kingdom','Italy','international');
 assert.equal(rejected.matches.length,0);
 assert.equal(rejected.equivalentResults.raw_text,'No matches.');
 const uk30={...italy,name:'Co-codamol 30/500 tablets',country:'United Kingdom',sources:uk.sources};
 assert.equal(sourced.exactComposition(italy,uk30),true);
 assert.equal(sourced.exactComposition(italy,{...uk30,form:'effervescent tablet'}),false);
});
function response(candidates=[candidate],sourceList=[...origin.sources,...candidate.sources],profile=origin){return {status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:sourceList.map(url=>({url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({origin:profile,candidates})}]}]};}
test('exact full composition rejects extra/missing/duplicate ingredients, strength/basis, salt, route and form differences',()=>{
 assert.equal(sourced.exactComposition(origin,candidate),true);
 assert.equal(sourced.exactComposition(origin,{...candidate,ingredients:[ingredient('Paracetamol','500.0 mg / tablet'),ingredient('Codeine phosphate','8.00 mg/tablet')]}),true);
 for(const replacement of [
  {ingredients:[...candidate.ingredients,ingredient('Caffeine','30 mg/tablet')]},
  {ingredients:[candidate.ingredients[0]]},{ingredients:[...candidate.ingredients,candidate.ingredients[0]]},
  {ingredients:[candidate.ingredients[0],ingredient('Codeine phosphate','30 mg/tablet')]},
  {ingredients:[ingredient('Paracetamol','500 mg/ml'),candidate.ingredients[1]]},
  {ingredients:[candidate.ingredients[0],ingredient('Codeine','8 mg/tablet')]},
  {form:'capsule'},{route:'intravenous'},{complete:false}
 ])assert.equal(sourced.exactComposition(origin,{...candidate,...replacement}),false,JSON.stringify(replacement));
 assert.equal(sourced.exactComposition(origin,candidate,false,true),false);
 assert.equal(sourced.exactComposition(origin,{...candidate,species:['dog']}),false);
 assert.equal(sourced.exactComposition({...origin,species:['dog']},{...candidate,species:['dog',null]},true),false);
 assert.equal(sourced.exactComposition({...origin,species:['dog']},{...candidate,species:['cat']},true),false);
});
test('only retrieved trusted country-specific source URLs allow a candidate; rejected lists never fall back',()=>{
 const data=sourced.readSourcedMatches(response(),'United Kingdom','Ireland','international');assert.match(data.equivalentResults.raw_text,/Candidate/);
 for(const replacement of [{sources:['https://www.hpra.ie/never-retrieved']},{sources:['https://www.hpra.ie.evil.test/fixture']},{sources:['javascript:alert(1)']},{sources:[]},{country:'France'},{ingredients:[...candidate.ingredients,ingredient('Caffeine','30 mg/tablet')]}]){
  const rejected=sourced.readSourcedMatches(response([{...candidate,...replacement}]),'United Kingdom','Ireland','international');assert.equal(rejected.equivalentResults.raw_text,'No matches.');
 }
 assert.equal(sourced.readSourcedMatches(response([],[],origin),'United Kingdom','Ireland','international').error,'NOT_FOUND_ORIGIN');
 assert.throws(()=>sourced.readSourcedMatches({...response(),status:'incomplete'},'United Kingdom','Ireland','international'),/INCOMPLETE/);
});
test('unknown country coverage fails without provider calls; lookup uses required search and does not persist API state',async()=>{
 let calls=0;const api=load('source-matches',{openaiFetch:async(url,init)=>{calls++;assert.match(url,/\/responses$/);const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.tool_choice,'required');assert.ok(body.tools[0].filters.allowed_domains.includes(calls===1?'medicines.org.uk':'hpra.ie'));return Response.json(response());}});
 assert.equal((await api.sourceMatchedSearch({drugName:'Fixture',originCountry:'Unknown place',targetCountry:'Ireland'},'international')).status,503);assert.equal(calls,0);
 const result=await api.sourceMatchedSearch({drugName:'Fixture',originCountry:'United Kingdom',targetCountry:'Ireland'},'international');assert.equal(result.status,200);assert.equal(calls,2);
});
test('selected 500 + 8 cannot be silently replaced by a researched 500 + 30 origin',async()=>{
 assert.equal(sourced.selectedCombinationAgrees('500 + 8',origin.ingredients),true);
 assert.equal(sourced.selectedCombinationAgrees('8mg/500mg',origin.ingredients),true);
 assert.equal(sourced.selectedCombinationAgrees('500 + 30',origin.ingredients),false);
 assert.equal(sourced.selectedCombinationAgrees('500 mg/ml',origin.ingredients),null);
 let calls=0;const api=load('source-matches',{openaiFetch:async()=>{calls++;return Response.json(response([],origin.sources,origin));}});
 const result=await api.sourceMatchedSearch({drugName:'Co-codamol',originCountry:'United Kingdom',targetCountry:'Italy',drugDosage:'500 + 30'},'international');
 assert.equal(result.status,422);assert.equal((await result.json()).error,'ORIGIN_STRENGTH_MISMATCH');assert.equal(calls,1);
});
test('medicine summary requires known ingredients, every topic and an explicit note, rejects empty or truncated upstream output',async()=>{
 const topics=['Active Ingredients','Uses','Dosage','Contraindications','Warnings','Precautions','Side Effects','Interactions','Storage','Legal Classification','Manufacturer','Average Selling Price','Note'];const information_sections=Object.fromEntries(topics.map(t=>[t,[]]));information_sections['Active Ingredients']=['Fixture ingredient 5 mg per tablet'];information_sections.Note=['AI-generated educational summary; not an official leaflet.'];
 const helper=load('medicine-summary');assert.match(helper.summaryText({known:true,information_sections}),/Active Ingredients\n- Fixture/);assert.equal(helper.summaryText({known:false,information_sections}),null);assert.equal(helper.summaryText({known:true,information_sections:{...information_sections,Note:[]}}),null);
 assert.equal(helper.summaryText({known:true,information_sections:{...information_sections,'Active Ingredients':['Paracetamol and codeine phosphate.']}}),null);
 assert.equal(helper.summaryText({known:true,information_sections:{...information_sections,'Active Ingredients':['Paracetamol 500 mg per tablet','Codeine phosphate']}}),null);
 const api=load('medicine-summary',{openaiFetch:async()=>Response.json({choices:[{finish_reason:'length',message:{content:JSON.stringify({known:true,information_sections})}}]})});assert.equal((await api.medicineSummary({drugName:'Fixture',originCountry:'UK'})).status,503);
});
test('evidence URLs are bounded, deduplicated and cannot become script or credential-bearing links',()=>{
 const {medicineSources}=load('medicine-evidence');
 const urls=medicineSources(['https://www.hpra.ie/fixture','https://www.hpra.ie/fixture','javascript:alert(1)','http://www.hpra.ie/fixture','https://user:secret@www.hpra.ie/fixture']);
 assert.equal(urls.length,1);assert.equal(urls[0],'https://www.hpra.ie/fixture');
});
test('a signed source profile controls summary ingredients even when the model adds caffeine',async()=>{
 const topics=['Active Ingredients','Uses','Dosage','Contraindications','Warnings','Precautions','Side Effects','Interactions','Storage','Legal Classification','Manufacturer','Average Selling Price','Note'];
 const sections=Object.fromEntries(topics.map(t=>[t,[]]));sections['Active Ingredients']=['Caffeine 30 mg per tablet'];sections.Note=['AI educational summary; not an official leaflet.'];
 const profile={name:'Fixture Tablets',ingredients:[{name:'Paracetamol',strength:'500 mg/tablet'},{name:'Codeine phosphate',strength:'12.8 mg/tablet'}]};
 const api=load('medicine-summary',{readOriginSelection:token=>token==='valid'?profile:null,openaiFetch:async(url,init)=>{assert.equal(JSON.parse(init.body).messages[1].content.includes('sourceProfile'),true);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({known:true,information_sections:sections})}}]});}});
 const response=await api.medicineSummary({drugName:'Fixture Tablets',originCountry:'United Kingdom',originQueryName:'Fixture',originSelection:'valid'});assert.equal(response.status,200);const data=await response.json();assert.match(data.leaflet.leaflet_text,/12.8 mg\/tablet/);assert.doesNotMatch(data.leaflet.leaflet_text,/Caffeine/);
 assert.equal((await api.medicineSummary({drugName:'Fixture Tablets',originCountry:'United Kingdom',originSelection:'altered'})).status,422);
});
