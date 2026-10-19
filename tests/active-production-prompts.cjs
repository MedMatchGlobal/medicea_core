const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),productionRef='f4ab1bd',dev={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_TRAVEL_CONNECTED:'true',MEDICEA_OPENAI_UPGRADE:'true',OPENAI_API_KEY:'public-fixture-not-real'};
// Read the immutable Production source, not the current branch's preserved but
// potentially bypassed declarations. No baseline is regenerated and no network
// or real provider request is permitted by this harness.
function reference(file){return execFileSync('git',['show',productionRef+':'+file],{cwd:root,encoding:'utf8'});}
function harness(settings,replies,source){const cache={},calls=[];function load(file){file=file.replace(/\\/g,'/');if(cache[file])return cache[file];const module={exports:{}};cache[file]=module.exports;const absolute=path.join(root,file);const input=source&&file.startsWith('app/api/')?reference(file):fs.readFileSync(absolute,'utf8');vm.runInNewContext(ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,process:{env:settings},console:{log(){},error(){},warn(){},info(){}},fetch:async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions','Experimental source search must not run');calls.push(JSON.parse(init.body));assert.ok(calls.length<=replies.length,'Unexpected additional provider call');return Response.json({model:JSON.parse(init.body).model,choices:[{finish_reason:'stop',message:{content:replies[calls.length-1]}}]});},Request,Response,Headers,URL,Buffer,AbortController,setTimeout,clearTimeout,require(name){if(name==='next/server')return {NextResponse:{json:Response.json}};if(name==='@/lib/membership/meter')return {withMembership:h=>h};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(absolute),name))+'.ts');return require(name);}});cache[file]=module.exports;return module.exports;}return {load,calls};}
const body={drugName:'Public example',originCountry:'Italy',targetCountry:'United Kingdom',drugDosage:'50 mg',lang:'en'};
const profile=JSON.stringify({medicine_name:'Public example',origin_country:'Italy',active_ingredients:[{name:'Example ingredient',strength:'50 mg'}]});
const leaflet=JSON.stringify({leaflet_text:'Active Ingredients:\n- Example ingredient\nStrength:\n- 50 mg'});
const cases=[
 ['international','app/api/openai/equivalent-search/route.ts',body,[profile,'Public equivalent: Example ingredient 50 mg']],
 ['human generics','app/api/openai/generics/route.ts',body,[profile,'Public generic: Example ingredient 50 mg']],
 ['veterinary international','app/api/openai/pets/route.ts',body,[profile,'Public veterinary equivalent: Example ingredient 50 mg']],
 ['veterinary generics','app/api/openai/pet-generics/route.ts',body,[profile,'Public veterinary generic: Example ingredient 50 mg']],
 ['English leaflet','app/api/openai/leaflet/route.ts',body,[leaflet]],
 ['translated leaflet','app/api/openai/leaflet/route.ts',{...body,lang:'it'},[leaflet,JSON.stringify({leaflet_text:'Active Ingredients:\n- Ingrediente di esempio\nStrength:\n- 50 mg'})]],
 ['general medicine information','app/api/openai/route.ts',body,['Public educational information']],
 ['veterinary information','app/api/openai/veterinary-information/route.ts',body,[JSON.stringify({information_sections:{Note:['Public fixture only']}})]],
 ['condition information','app/api/ai-search/route.ts',{selectedCondition:'Public fixture condition',lang:'it',originCountry:'Italy'},['Public educational condition response']],
 ['triage','app/api/triage/route.ts',{messages:[{role:'user',content:'Public fictional example'}]},['Public educational triage response']],
 ['text translation','app/api/translate/route.ts',{text:'Public example 50 mg',target:'Italian'},['Esempio pubblico 50 mg']],
 ['JSON translation','app/api/translate-json/route.ts',{data:{label:'Public example 50 mg'},lang:'it'},[JSON.stringify({label:'Esempio pubblico 50 mg'})]],
];
const structuredCases=new Set(['English leaflet','translated leaflet','general medicine information','veterinary information']);
const structuredReply=JSON.stringify({information_sections:Object.fromEntries(['Active Ingredients','Strength','Dosage','Indications','Contraindications','Precautions','Side Effects','Interactions','Legal Classification','Storage','Manufacturer','Average Selling Price'].map(key=>[key,key==='Active Ingredients'?['Example ingredient']:key==='Strength'?['Example ingredient 50 mg per capsule']:[]]))});
for(const [label,file,input,replies] of cases)test('active '+label+(structuredCases.has(label)?' uses the authorised structured Dev contract':' sends identical Production prompt messages on Sol'),async()=>{
 const formatted=structuredCases.has(label),baseline=harness({...dev,VERCEL_ENV:'production'},replies,true),current=harness(dev,formatted?[structuredReply]:replies,false);
 const request=()=>new Request('https://owner-demo.invalid/'+file,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const before=await baseline.load(file).POST(request()),after=await current.load(file).POST(request());
 assert.equal(before.status,200,'Production fixture must succeed');assert.equal(after.status,200,'Dev fixture must succeed');
 if(formatted){const result=await after.json();assert.equal(current.calls.length,1);assert.equal(current.calls[0].model,'gpt-6.1-sol');assert.equal(current.calls[0].response_format.json_schema.strict,true);assert.equal(result.sections.length,12);assert.equal(result.verification,'ai_generated_unverified');return;}
 assert.equal(current.calls.length,replies.length);assert.equal(current.calls.length,baseline.calls.length);
 for(let i=0;i<current.calls.length;i++){assert.deepEqual(current.calls[i].messages,baseline.calls[i].messages);assert.deepEqual(current.calls[i].response_format,baseline.calls[i].response_format);assert.equal(current.calls[i].model,'gpt-6.1-sol');assert.equal(current.calls[i].reasoning_effort,'low');assert.equal(current.calls[i].temperature,undefined);assert.equal(current.calls[i].seed,undefined);}
 assert.deepEqual(await after.json().catch(()=>null),await before.json().catch(()=>null));
});

test('Travel medicine information uses the same twelve-section schema in the requested language',async()=>{
 const current=harness(dev,[structuredReply],false);
 const response=await current.load('app/lib/travel-original-search.ts').originalTravelInformation(body.drugName,body.originCountry,body.drugDosage,'it');
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.sections.length,12);assert.equal(current.calls.length,1);assert.equal(current.calls[0].response_format.json_schema.strict,true);assert.equal(JSON.parse(current.calls[0].messages[1].content).language,'it');
});
