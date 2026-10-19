const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.join(__dirname,'..'),env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_TRAVEL_CONNECTED:'true',MEDICEA_OPENAI_UPGRADE:'true',OPENAI_API_KEY:'fictional-test-key'};
function loader(payload,settings=env,pricePayload){const cache={},calls=[];function load(file){file=file.replace(/\\/g,'/');if(file==='app/lib/leaflet-price.ts'&&pricePayload===undefined)return {lookupLeafletPrice:async()=>[]};if(cache[file])return cache[file];const absolute=path.join(root,file),module={exports:{}};cache[file]=module.exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,process:{env:settings},Request,Response,Headers,URL,Buffer,AbortController,setTimeout,clearTimeout,console:{info(){},warn(){},error(){}},fetch:async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json(String(url).endsWith('/responses')?pricePayload:payload);},require(name){if(name.startsWith('.')){let f=path.relative(root,path.resolve(path.dirname(absolute),name));if(!path.extname(f))f+=fs.existsSync(path.join(root,f+'.tsx'))?'.tsx':'.ts';return load(f);}return require(name);}});cache[file]=module.exports;return module.exports;}return {load,calls};}
const topics=['Active Ingredients','Strength','Dosage','Indications','Contraindications','Precautions','Side Effects','Interactions','Legal Classification','Storage','Manufacturer','Average Selling Price'];
const values=()=>({information_sections:Object.fromEntries(topics.map(key=>[key,key==='Active Ingredients'?['Example ingredient']:key==='Strength'?['Example ingredient: 10 mg per tablet']:[]]))});
const completed=value=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
const input={drugName:'Public fixture medicine',originCountry:'Italy',lang:'en'};

test('shared contract enforces all twelve arrays and rejects missing sections, prose, unsafe markup and oversized bullets',()=>{
 const h=loader(),c=h.load('app/lib/leaflet-contract.ts'),valid=values();assert.deepEqual(Array.from(c.LEAFLET_TOPICS),topics);assert.equal(c.validateLeaflet(valid).length,12);
 const missing=values();delete missing.information_sections.Dosage;
 const extra=values();extra.information_sections.Other=[];
 for(const value of [missing,extra,{...valid,extra:true},{information_sections:{...valid.information_sections,Dosage:'A paragraph'}},{information_sections:{...valid.information_sections,Dosage:['Line one\nLine two']}},{information_sections:{...valid.information_sections,Dosage:['<script>bad</script>']}},{information_sections:{...valid.information_sections,Dosage:['x'.repeat(601)]}},{information_sections:{...valid.information_sections,Dosage:['**']}}])assert.throws(()=>c.validateLeaflet(value));
});
test('successful generation uses strict schema on Sol, keeps unknown fields visible, and never claims official retrieval',async()=>{
 const h=loader(completed(values())),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].model,'gpt-6.1-sol');assert.equal(h.calls[0].response_format.type,'json_schema');assert.equal(h.calls[0].response_format.json_schema.strict,true);assert.equal(data.sections.length,12);assert.equal(data.sections[11].bullets[0],'Not specified');assert.equal(data.verification,'ai_generated_unverified');assert.equal(h.load('app/lib/leaflet-contract.ts').readStructuredLeaflet(data.leaflet.leaflet_text).length,12);assert.match(h.calls[0].messages[0].content,/not dosage|not dosage/i);assert.match(h.calls[0].messages[0].content,/not fetched an official leaflet/);
});
test('refusal, truncation and malformed structure fail explicitly without a success leaflet or automatic retries',async()=>{
 for(const payload of [{choices:[{finish_reason:'length',message:{content:JSON.stringify(values())}}]},{choices:[{finish_reason:'stop',message:{refusal:'No',content:null}}]},completed({information_sections:{}}),{choices:[{finish_reason:'stop',message:{content:'not JSON'}}]}]){
  const h=loader(payload),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input);assert.equal(response.status,503);assert.equal((await response.json()).leaflet,undefined);assert.equal(h.calls.length,1);
 }
});
test('language and animal audience share the contract while preserving species safeguards and translated placeholders',async()=>{
 const h=loader(completed(values())),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,lang:'it'},'veterinary'),data=await response.json();assert.equal(response.status,200);assert.equal(data.sections[11].bullets[0],'Non specificato');const task=JSON.parse(h.calls[0].messages[1].content);assert.equal(task.language,'it');assert.equal(task.audience,'veterinary');assert.match(h.calls[0].messages[0].content,/never substitute human facts/);
 for(const settings of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'other'}]){const off=loader(completed(values()),settings);assert.equal((await off.load('app/lib/structured-leaflet.ts').structuredLeaflet(input)).status,404);assert.equal(off.calls.length,0);}
 const bad=loader(completed(values()));assert.equal((await bad.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,originSelection:'altered'})).status,422);assert.equal(bad.calls.length,0);
});
test('shared renderer creates exactly twelve ordered headings and real bullet lists, including missing-value bullets',()=>{
 const h=loader(),c=h.load('app/lib/leaflet-contract.ts'),sections=c.readStructuredLeaflet(c.leafletText(c.validateLeaflet(values()),'Not specified'));
 const Component=h.load('app/components/StructuredLeafletSections.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Component,{sections,lang:'en',notice:'AI-generated; not independently verified.'}));assert.equal((html.match(/<section /g)||[]).length,12);assert.equal((html.match(/<ul /g)||[]).length,12);assert.equal((html.match(/<li /g)||[]).length,12);assert.match(html,/<strong>Strengths:<\/strong>/);let last=-1;for(const key of topics){const index=html.indexOf((key==='Strength'?'Strengths':key)+':');assert.ok(index>last);last=index;}
 assert.equal(c.readStructuredLeaflet('Uses:\nOne unstructured paragraph.'),null);
});


test('brand-only requests request labelled variants instead of blanket omissions, and retain all five metadata sections',async()=>{
 const value=values();value.information_sections.Strength=['Tablet variant: fictional ingredient 10 mg per tablet','Liquid variant: fictional ingredient 5 mg per mL'];value.information_sections.Dosage=['Not established for this fixture'];value.information_sections['Legal Classification']=['Fictional country category'];value.information_sections.Manufacturer=['Fictional manufacturer'];value.information_sections['Average Selling Price']=['Fictional indicative pack price, not a live quote'];
 const h=loader(completed(value)),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);const prompt=h.calls[0].messages[0].content;
 assert.match(prompt,/product-family overview/);assert.match(prompt,/each names its exact strength, formulation/);assert.match(prompt,/unselected formulation must not automatically blank/);assert.match(prompt,/currency, country and pack size/);assert.doesNotMatch(prompt,/leave variant-specific Strength and Dosage empty/);
 assert.equal(data.sections[1].bullets.length,2);for(const key of ['Dosage','Legal Classification','Manufacturer','Average Selling Price'])assert.deepEqual(data.sections.find(s=>s.key===key).bullets,value.information_sections[key]);
});

test('a valid previously selected profile retains its strength when the model omits it, without inventing dosage or price',async()=>{
 const value=values();value.information_sections.Strength=[];const h=loader(completed(value));
 const profile={name:input.drugName,country:'Italy',form:'Tablet',route:'Oral',species:[],complete:true,generic:false,ingredients:[{name:'Fictional ingredient',strength:'10 mg per tablet'}],sources:[]};
 const token=h.load('app/lib/origin-lookup.ts').issueOriginSelection(profile,input.drugName);
 const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,originSelection:token}),data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.sections[1].bullets,['Fictional ingredient: 10 mg per tablet']);assert.equal(data.sections[2].bullets[0],'Not specified');assert.equal(data.sections[11].bullets[0],'Not specified');assert.equal(data.verification,'ai_generated_unverified');assert.equal(h.calls.length,1);
});
const priceQuote={product:'Fictional tablets 10 mg',pack:'20 tablets',price:'8.50',currency:'EUR',country:'Italy',source:'https://www.example.com/fictional-pack',note:'Listed price, not an average or guaranteed checkout price'};
const priceResult=(quotes=[priceQuote],sources=[priceQuote.source])=>({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:sources.map(url=>({url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({quotes})}]}]});
test('missing leaflet price receives one Sol web lookup with dated, source-linked pack quotes',async()=>{
 const h=loader(completed(values()),env,priceResult()),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,2);const call=h.calls[1];assert.equal(call.model,'gpt-6.1-sol');assert.equal(call.tools[0].type,'web_search');assert.equal(call.tool_choice,'required');assert.equal(call.text.format.strict,true);assert.equal(call.store,false);assert.match(data.sections[11].bullets[0],/8.50 EUR/);assert.match(data.sections[11].bullets[0],/20 tablets/);assert.match(data.sections[11].bullets[0],/\d{4}-\d{2}-\d{2}/);assert.match(data.sections[11].bullets[0],/https:\/\/www.example.com/);assert.equal(data.verification,'ai_generated_unverified');
 const c=h.load('app/components/StructuredLeafletSections.tsx').default,html=renderToStaticMarkup(React.createElement(c,{sections:data.sections}));assert.match(html,/href="https:\/\/www.example.com\/fictional-pack"/);assert.match(html,/referrerPolicy="no-referrer"/i);
});
test('price evidence rejects unsearched URLs, unsafe links, wrong countries, missing packs and nonnumeric amounts',()=>{
 const h=loader(null,env,priceResult()),read=h.load('app/lib/leaflet-price.ts').readPriceQuotes;
 for(const [q,sources] of [[{...priceQuote,source:'https://not-retrieved.example.com/pack'},[priceQuote.source]],[{...priceQuote,source:'http://www.example.com/pack'},['http://www.example.com/pack']],[{...priceQuote,source:'https://127.0.0.1/pack'},['https://127.0.0.1/pack']],[{...priceQuote,country:'France'},[priceQuote.source]],[{...priceQuote,pack:''},[priceQuote.source]],[{...priceQuote,price:'made up'},[priceQuote.source]]])assert.equal(read(priceResult([q],sources),'Italy','2026-10-19').length,0);
 assert.equal(read({...priceResult(),status:'incomplete'},'Italy','2026-10-19').length,0);
});
test('price failures keep a usable leaflet; existing prices, exhausted budgets and Production do not add research',async()=>{
 const h=loader(completed(values()),env,{status:'incomplete'}),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input);assert.equal(response.status,200);assert.equal((await response.json()).sections[11].bullets[0],'Not specified');
 const v=values();v.information_sections['Average Selling Price']=['Existing indicative fixture price'];const known=loader(completed(v),env,priceResult());assert.equal((await known.load('app/lib/structured-leaflet.ts').structuredLeaflet(input)).status,200);assert.equal(known.calls.length,1);
 const empty=loader(null,env,priceResult());assert.equal((await empty.load('app/lib/leaflet-price.ts').lookupLeafletPrice({...input,audience:'human',selectedProfile:null},1000)).length,0);assert.equal(empty.calls.length,0);
 const off=loader(null,{...env,VERCEL_ENV:'production'},priceResult());assert.equal((await off.load('app/lib/leaflet-price.ts').lookupLeafletPrice({...input,audience:'human',selectedProfile:null},10000)).length,0);assert.equal(off.calls.length,0);
});
