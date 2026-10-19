const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.join(__dirname,'..'),env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/travel-pack-preview',MEDICEA_TRAVEL_CONNECTED:'true',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_SIMPLE_LEAFLET:'false',OPENAI_API_KEY:'fictional-test-key'};
function loader(payload,settings=env,pricePayload){const cache={},calls=[];function load(file){file=file.replace(/\\/g,'/');if(file==='app/lib/leaflet-price.ts'&&pricePayload===undefined)return {lookupLeafletPrice:async()=>[]};if(cache[file])return cache[file];const absolute=path.join(root,file),module={exports:{}};cache[file]=module.exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,process:{env:settings},Request,Response,Headers,URL,Buffer,AbortController,ReadableStream,TextEncoder,TextDecoder,setTimeout,clearTimeout,console:{info(){},warn(){},error(){}},fetch:async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json(String(url).endsWith('/responses')?(typeof pricePayload==='function'?await pricePayload():pricePayload):payload);},require(name){if(name.startsWith('.')){let f=path.relative(root,path.resolve(path.dirname(absolute),name));if(!path.extname(f))f+=fs.existsSync(path.join(root,f+'.tsx'))?'.tsx':'.ts';return load(f);}return require(name);}});cache[file]=module.exports;return module.exports;}return {load,calls};}
const topics=['Active Ingredients','Strength','Formulation','Indications','Contraindications','Precautions','Side Effects','Interactions','Legal Classification','Manufacturer','Average Selling Price'];
const values=()=>({information_sections:Object.fromEntries(topics.map(key=>[key,key==='Active Ingredients'?['Example ingredient']:key==='Strength'?['Example ingredient: 10 mg per tablet']:[]]))});
const completed=value=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
const input={drugName:'Public fixture medicine',originCountry:'Italy',lang:'en'};

test('shared contract enforces all eleven arrays and rejects missing sections, prose, unsafe markup and oversized bullets',()=>{
 const h=loader(),c=h.load('app/lib/leaflet-contract.ts'),valid=values();assert.deepEqual(Array.from(c.LEAFLET_TOPICS),topics);assert.equal(c.validateLeaflet(valid).length,11);
 const missing=values();delete missing.information_sections.Formulation;
 const extra=values();extra.information_sections.Other=[];
 for(const value of [missing,extra,{...valid,extra:true},{information_sections:{...valid.information_sections,Formulation:'A paragraph'}},{information_sections:{...valid.information_sections,Formulation:['Line one\nLine two']}},{information_sections:{...valid.information_sections,Formulation:['<script>bad</script>']}},{information_sections:{...valid.information_sections,Formulation:['x'.repeat(601)]}},{information_sections:{...valid.information_sections,Formulation:['**']}}])assert.throws(()=>c.validateLeaflet(value));
});
test('successful generation uses strict schema on Sol, keeps unknown fields visible, and never claims official retrieval',async()=>{
 const h=loader(completed(values())),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].model,'gpt-6.1-sol');assert.equal(h.calls[0].response_format.type,'json_schema');assert.equal(h.calls[0].response_format.json_schema.strict,true);assert.equal(data.sections.length,11);assert.equal(data.sections[10].bullets[0],'Not specified');assert.equal(data.verification,'ai_generated_unverified');assert.equal(h.load('app/lib/leaflet-contract.ts').readStructuredLeaflet(data.leaflet.leaflet_text).length,11);assert.match(h.calls[0].messages[0].content,/not dosage|not dosage/i);assert.match(h.calls[0].messages[0].content,/not fetched an official leaflet/);
});
test('refusal, truncation and malformed structure fail explicitly without a success leaflet or automatic retries',async()=>{
 for(const payload of [{choices:[{finish_reason:'length',message:{content:JSON.stringify(values())}}]},{choices:[{finish_reason:'stop',message:{refusal:'No',content:null}}]},completed({information_sections:{}}),{choices:[{finish_reason:'stop',message:{content:'not JSON'}}]}]){
  const h=loader(payload),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input);assert.equal(response.status,503);assert.equal((await response.json()).leaflet,undefined);assert.equal(h.calls.length,1);
 }
});
test('language and animal audience share the contract while preserving species safeguards and translated placeholders',async()=>{
 const h=loader(completed(values())),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,lang:'it'},'veterinary'),data=await response.json();assert.equal(response.status,200);assert.equal(data.sections[10].bullets[0],'Non specificato');const task=JSON.parse(h.calls[0].messages[1].content);assert.equal(task.language,'it');assert.equal(task.audience,'veterinary');assert.match(h.calls[0].messages[0].content,/never substitute human facts/);
 for(const settings of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'other'}]){const off=loader(completed(values()),settings);assert.equal((await off.load('app/lib/structured-leaflet.ts').structuredLeaflet(input)).status,404);assert.equal(off.calls.length,0);}
 const bad=loader(completed(values()));assert.equal((await bad.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,originSelection:'altered'})).status,422);assert.equal(bad.calls.length,0);
});
test('shared renderer creates exactly eleven ordered headings and real bullet lists, including missing-value bullets',()=>{
 const h=loader(),c=h.load('app/lib/leaflet-contract.ts'),sections=c.readStructuredLeaflet(c.leafletText(c.validateLeaflet(values()),'Not specified'));
 const Component=h.load('app/components/StructuredLeafletSections.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Component,{sections,lang:'en',notice:'AI-generated; not independently verified.'}));assert.equal((html.match(/<section /g)||[]).length,11);assert.equal((html.match(/<ul /g)||[]).length,11);assert.equal((html.match(/<li /g)||[]).length,11);assert.match(html,/<strong>Strengths:<\/strong>/);let last=-1;for(const key of topics){const index=html.indexOf((key==='Strength'?'Strengths':key==='Formulation'?'Formulations':key)+':');assert.ok(index>last);last=index;}
 assert.equal(c.readStructuredLeaflet('Uses:\nOne unstructured paragraph.'),null);
});


test('brand-only requests request labelled variants instead of blanket omissions, and retain all five metadata sections',async()=>{
 const value=values();value.information_sections.Strength=['Tablet variant: fictional ingredient 10 mg per tablet','Liquid variant: fictional ingredient 5 mg per mL'];value.information_sections.Formulation=['Not established for this fixture'];value.information_sections['Legal Classification']=['Fictional country category'];value.information_sections.Manufacturer=['Fictional manufacturer'];value.information_sections['Average Selling Price']=['Fictional indicative pack price, not a live quote'];
 const h=loader(completed(value)),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);const prompt=h.calls[0].messages[0].content;
 assert.match(prompt,/product-family overview/);assert.match(prompt,/Never provide dosing schedules/);assert.match(prompt,/unselected formulation must not automatically blank/);assert.match(prompt,/currency, country and pack size/);assert.doesNotMatch(prompt,/leave variant-specific Strength and Dosage empty/);
 assert.equal(data.sections[1].bullets.length,2);for(const key of ['Formulation','Legal Classification','Manufacturer','Average Selling Price'])assert.deepEqual(data.sections.find(s=>s.key===key).bullets,value.information_sections[key]);
});

test('a valid previously selected profile retains its strength when the model omits it, without inventing dosage or price',async()=>{
 const value=values();value.information_sections.Strength=[];const h=loader(completed(value));
 const profile={name:input.drugName,country:'Italy',form:'Tablet',route:'Oral',species:[],complete:true,generic:false,ingredients:[{name:'Fictional ingredient',strength:'10 mg per tablet'}],sources:[]};
 const token=h.load('app/lib/origin-lookup.ts').issueOriginSelection(profile,input.drugName);
 const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet({...input,originSelection:token}),data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.sections[1].bullets,['Fictional ingredient: 10 mg per tablet']);assert.equal(data.sections[2].bullets[0],'Not specified');assert.equal(data.sections[10].bullets[0],'Not specified');assert.equal(data.verification,'ai_generated_unverified');assert.equal(h.calls.length,1);
});
const priceQuote={product:'Fictional tablets 10 mg',pack:'20 tablets',price:'8.50',currency:'EUR',country:'Italy',source:'https://www.example.com/fictional-pack',note:'Listed price, not an average or guaranteed checkout price'};
const priceResult=(quotes=[priceQuote],sources=[priceQuote.source])=>({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:sources.map(url=>({url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({quotes})}]}]});
test('missing leaflet price receives one Sol web lookup with dated, source-linked pack quotes',async()=>{
 const h=loader(completed(values()),env,priceResult()),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,2);const call=h.calls[1];assert.equal(call.model,'gpt-6.1-sol');assert.equal(call.tools[0].type,'web_search');assert.equal(call.tool_choice,'required');assert.equal(call.text.format.strict,true);assert.equal(call.store,false);assert.match(data.sections[10].bullets[0],/8.50 EUR/);assert.match(data.sections[10].bullets[0],/20 tablets/);assert.match(data.sections[10].bullets[0],/\d{4}-\d{2}-\d{2}/);assert.match(data.sections[10].bullets[0],/https:\/\/www.example.com/);assert.equal(data.verification,'ai_generated_unverified');
 const c=h.load('app/components/StructuredLeafletSections.tsx').default,html=renderToStaticMarkup(React.createElement(c,{sections:data.sections}));assert.match(html,/href="https:\/\/www.example.com\/fictional-pack"/);assert.match(html,/referrerPolicy="no-referrer"/i);
});
test('price evidence rejects unsearched URLs, unsafe links, wrong countries, missing packs and nonnumeric amounts',()=>{
 const h=loader(null,env,priceResult()),read=h.load('app/lib/leaflet-price.ts').readPriceQuotes;
 for(const [q,sources] of [[{...priceQuote,source:'https://not-retrieved.example.com/pack'},[priceQuote.source]],[{...priceQuote,source:'http://www.example.com/pack'},['http://www.example.com/pack']],[{...priceQuote,source:'https://127.0.0.1/pack'},['https://127.0.0.1/pack']],[{...priceQuote,country:'France'},[priceQuote.source]],[{...priceQuote,pack:''},[priceQuote.source]],[{...priceQuote,price:'made up'},[priceQuote.source]]])assert.equal(read(priceResult([q],sources),'Italy','2026-10-19').length,0);
 assert.equal(read({...priceResult(),status:'incomplete'},'Italy','2026-10-19').length,0);
});
test('price failures keep a usable leaflet; existing prices, exhausted budgets and Production do not add research',async()=>{
 const h=loader(completed(values()),env,{status:'incomplete'}),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input);assert.equal(response.status,200);assert.equal((await response.json()).sections[10].bullets[0],'Not specified');
 const v=values();v.information_sections['Average Selling Price']=['Existing indicative fixture price'];const known=loader(completed(v),env,priceResult());assert.equal((await known.load('app/lib/structured-leaflet.ts').structuredLeaflet(input)).status,200);assert.equal(known.calls.length,1);
 const empty=loader(null,env,priceResult());assert.equal((await empty.load('app/lib/leaflet-price.ts').lookupLeafletPrice({...input,audience:'human',selectedProfile:null},1000)).length,0);assert.equal(empty.calls.length,0);
 const off=loader(null,{...env,VERCEL_ENV:'production'},priceResult());assert.equal((await off.load('app/lib/leaflet-price.ts').lookupLeafletPrice({...input,audience:'human',selectedProfile:null},10000)).length,0);assert.equal(off.calls.length,0);
});
test('Travel original-prompt context also permits the isolated price research transport on Sol',async()=>{
 const h=loader(null,env,priceResult());const result=await h.load('app/lib/openaiClient.ts').withOpenAIEvaluation(true,()=>h.load('app/lib/leaflet-price.ts').lookupLeafletPrice({...input,audience:'human',selectedProfile:null},10000));assert.equal(result.value.length,1);assert.equal(h.calls.length,1);assert.equal(h.calls[0].model,'gpt-6.1-sol');
});
test('Formulations replaces Dosage in generation and rendering, including translated headings',async()=>{
 const v=values();v.information_sections.Formulation=['Film-coated tablet','Effervescent tablet'];const h=loader(completed(v)),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(data.kind,'structured_leaflet_v2');assert.equal(data.sections[2].key,'Formulation');assert.equal(data.sections.some(s=>s.key==='Dosage'),false);const schema=h.calls[0].response_format.json_schema;assert.equal(schema.name,'medicea_leaflet_v2');assert.equal(schema.schema.properties.information_sections.required.includes('Dosage'),false);assert.match(h.calls[0].messages[0].content,/Never provide dosing schedules/);assert.match(h.calls[0].messages[0].content,/Do not relocate removed Dosage content/);
 const Component=h.load('app/components/StructuredLeafletSections.tsx').default,html=renderToStaticMarkup(React.createElement(Component,{sections:data.sections}));assert.match(html,/<strong>Formulations:<\/strong>/);assert.doesNotMatch(html,/<strong>Dosage:/);
 const it=renderToStaticMarkup(React.createElement(Component,{sections:data.sections,lang:'it'}));assert.match(it,/Forma farmaceutica/);
});
test('old structured snapshots keep other facts and price links while hiding old dosing text without relabelling it as a formulation',()=>{
 const h=loader(),c=h.load('app/lib/leaflet-contract.ts'),oldTopics=topics.map(k=>k==='Formulation'?'Dosage':k),text=oldTopics.map(k=>k+'\n- '+(k==='Dosage'?'Fictional old dosing schedule':'Saved '+k)).join('\n\n');
 const sections=c.readStructuredLeaflet(text);assert.equal(sections.length,11);assert.equal(sections[2].key,'Formulation');assert.equal(sections[2].bullets.length,0);assert.equal(sections[10].bullets[0],'Saved Average Selling Price');
 const Component=h.load('app/components/StructuredLeafletSections.tsx').default,html=renderToStaticMarkup(React.createElement(Component,{sections}));assert.match(html,/Formulations:/);assert.match(html,/Not specified/);assert.doesNotMatch(html,/Fictional old dosing schedule|Dosage:/);
 const Vet=h.load('app/components/VeterinaryLeafletSections.tsx').default,vet=renderToStaticMarkup(React.createElement(Vet,{sections:oldTopics.map(key=>({key,bullets:['Saved '+key]})),lang:'en',headings:{}}));assert.match(vet,/Formulations:/);assert.doesNotMatch(vet,/Dosage:/);
});
test('multi-supplier manufacturer guidance stays in the existing generation without extra research or model changes',async()=>{
 const v=values();v.information_sections.Manufacturer=['Manufacturer varies by the selected fictional product; check its pack.'];v.information_sections['Average Selling Price']=['Existing fixture price'];
 const h=loader(completed(v),env,priceResult()),response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();assert.equal(response.status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].model,'gpt-6.1-sol');assert.equal(h.calls[0].reasoning_effort,'low');assert.equal(data.sections[9].bullets[0],v.information_sections.Manufacturer[0]);
 const prompt=h.calls[0].messages[0].content;assert.match(prompt,/do not assign one manufacturer to the whole family/);assert.match(prompt,/Never guess a supplier/);assert.match(prompt,/manufacturers vary by product/);assert.match(response.headers.get('Server-Timing'),/^leaflet;dur=\d+, price;dur=\d+, total;dur=\d+$/);
});
test('identical leaflets are reused with preserved timestamps, while variant, country, language and audience stay isolated',async()=>{
 const v=values();v.information_sections['Average Selling Price']=['Existing fixture price'];const h=loader(completed(v)),generate=h.load('app/lib/structured-leaflet.ts').structuredLeaflet;
 const a=await generate(input),first=await a.json(),b=await generate(input),second=await b.json();assert.equal(h.calls.length,1);assert.equal(b.headers.get('X-Medicea-Leaflet-Reused'),'1');assert.equal(second.generatedAt,first.generatedAt);assert.deepEqual(second.sections,first.sections);
 for(const [change,audience] of [[{drugDosage:'20 mg'},'human'],[{originCountry:'France'},'human'],[{lang:'it'},'human'],[{},'veterinary']])assert.equal((await generate({...input,...change},audience)).status,200);assert.equal(h.calls.length,5);
 assert.equal((await generate({...input,originSelection:'invalid'})).status,422);assert.equal(h.calls.length,5);
});
test('concurrent identical requests share one generation and price lookup; failed results are not reused',async()=>{
 let finishPrice;const blocked=new Promise(resolve=>finishPrice=resolve),h=loader(completed(values()),env,()=>blocked),generate=h.load('app/lib/structured-leaflet.ts').structuredLeaflet;
 const first=generate(input),second=generate(input);while(h.calls.length<2)await new Promise(r=>setTimeout(r,1));assert.equal(h.calls.length,2);finishPrice(priceResult());const results=await Promise.all([first,second]);assert.equal(results.every(r=>r.status===200),true);assert.equal(h.calls.length,2);
 const failed=loader({choices:[{finish_reason:'length',message:{content:'{}'}}]}),fn=failed.load('app/lib/structured-leaflet.ts').structuredLeaflet;assert.equal((await fn(input)).status,503);assert.equal((await fn(input)).status,503);assert.equal(failed.calls.length,2);
});
test('validated core reaches the reader before price completion, with the same two provider calls and final evidence intact',async()=>{
 let finishPrice;const blocked=new Promise(resolve=>finishPrice=resolve),h=loader(completed(values()),env,()=>blocked),generate=h.load('app/lib/structured-leaflet.ts').structuredLeaflet,progress=h.load('app/lib/leaflet-progress.ts');let seen;
 const response=progress.leafletProgress(ready=>generate(input,'human',ready)),completedRead=progress.readLeafletResponse(response,p=>seen=p,'Checking price…');
 while(!seen)await new Promise(r=>setTimeout(r,1));assert.equal(seen.sections.length,11);assert.equal(seen.pricePending,true);assert.match(seen.leaflet.leaflet_text,/Checking price…/);assert.equal(h.calls.length,2);finishPrice(priceResult());
 const final=await completedRead;assert.match(final.sections[10].bullets[0],/8.50 EUR/);assert.match(final.serverTiming,/leaflet;dur=/);assert.equal(h.calls.length,2);
});
test('progress reader rejects error and truncated streams, handles chunked Unicode and retains ordinary JSON compatibility',async()=>{
 const h=loader(),p=h.load('app/lib/leaflet-progress.ts');await assert.rejects(()=>p.readLeafletResponse(p.leafletProgress(async()=>Response.json({error:'failed'},{status:503})),()=>{}));
 await assert.rejects(()=>p.readLeafletResponse(new Response('{"type":"ready","payload":{}}\n',{headers:{'Content-Type':'application/x-ndjson'}}),()=>{}));
 assert.deepEqual(await p.readLeafletResponse(Response.json({leaflet:'Existing JSON contract'}),()=>{}),{leaflet:'Existing JSON contract'});
 const bytes=new TextEncoder().encode('{"type":"ready","payload":{"text":"médicéa"}}\n{"type":"complete","payload":{"ok":true}}\n');let label;
 const stream=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}});assert.equal((await p.readLeafletResponse(new Response(stream,{headers:{'Content-Type':'application/x-ndjson'}}),value=>label=value.text)).ok,true);assert.equal(label,'médicéa');
});
test('in-memory reuse expires and remains bounded without retaining raw request identities',async()=>{
 let now=1000,calls=0;const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'app/lib/leaflet-reuse.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require,Response,Headers,Date:{now:()=>now}});const reuse=module.exports.reuseLeaflet,run=async()=>{calls++;return Response.json({ok:true});};
 await reuse('same',run);await reuse('same',run);assert.equal(calls,1);now+=600001;await reuse('same',run);assert.equal(calls,2);
 for(let i=0;i<65;i++)await reuse('other-'+i,run);await reuse('same',run);assert.equal(calls,68);
});
test('unavailable optional prices stay retryable rather than being cached as a complete priced leaflet',async()=>{
 const h=loader(completed(values()),env,{status:'incomplete'}),generate=h.load('app/lib/structured-leaflet.ts').structuredLeaflet;assert.equal((await generate(input)).status,200);assert.equal((await generate(input)).status,200);assert.equal(h.calls.length,4);
});


test('Storage is neither requested nor rendered, and older stored leaflets remain readable',async()=>{
 const h=loader(completed(values())),c=h.load('app/lib/leaflet-contract.ts');
 const response=await h.load('app/lib/structured-leaflet.ts').structuredLeaflet(input),data=await response.json();
 assert.equal(h.calls[0].response_format.json_schema.schema.properties.information_sections.required.includes('Storage'),false);
 assert.match(h.calls[0].messages[0].content,/Do not request or include a Storage section/);
 const savedTopics=[...topics.slice(0,9),'Storage',...topics.slice(9)];
 for(const legacy of [false,true]){
  const text=savedTopics.map(k=>(legacy&&k==='Formulation'?'Dosage':k)+'\n- Saved '+k).join('\n\n');
  const parsed=c.readStructuredLeaflet(text);assert.equal(parsed.length,11);assert.equal(parsed.some(s=>s.key==='Storage'),false);assert.equal(parsed.at(-1).bullets[0],'Saved Average Selling Price');
 }
 assert.equal(data.sections.some(s=>s.key==='Storage'),false);
});


test('simplified experiment uses one researched Sol response for leaflet and prices with local formatting and exact reuse',async()=>{
 const info=values();info.information_sections.Manufacturer=['Example maker for the fictional 10 mg tablet'];info.information_sections.Contraindications=['Fictional contraindication'];
 const reply=priceResult();reply.output[1].content[0].text=JSON.stringify({...info,quotes:[priceQuote]});
 const h=loader(null,{...env,MEDICEA_SIMPLE_LEAFLET:'true'},reply),generate=h.load('app/lib/simple-research-leaflet.ts').simpleResearchLeaflet;let ready;
 const response=await generate({...input,drugDosage:'',audience:'human',selected:null},p=>ready=p),data=await response.json();
 assert.equal(response.status,200);assert.equal(data.experiment,'simple-research-v1');assert.equal(data.sections.length,11);assert.match(data.sections.at(-1).bullets[0],/8.50 EUR/);assert.equal(ready.pricePending,false);assert.equal(h.calls.length,1);
 const call=h.calls[0];assert.equal(call.model,'gpt-6.1-sol');assert.equal(call.max_tool_calls,1);assert.equal(call.tool_choice,'required');assert.equal(call.text.format.strict,true);assert.match(call.input,/Tell me everything you know about Public fixture medicine sold in Italy including prices and manufacturers/);assert.match(call.instructions,/Clearly separate contraindications/);assert.match(call.instructions,/No Storage section or dosing schedules/);assert.equal(call.text.format.schema.properties.information_sections.required.includes('Storage'),false);
 assert.match(data.leaflet.leaflet_text,/Manufacturer\n- Example maker/);await generate({...input,drugDosage:'',audience:'human',selected:null});assert.equal(h.calls.length,1);
});

test('simplified experiment has no price fallback, rejects incomplete output and does not retry provider errors',async()=>{
 const reply=priceResult([{...priceQuote,country:'France'}]);reply.output[1].content[0].text=JSON.stringify({...values(),quotes:[{...priceQuote,country:'France'}]});
 const h=loader(null,{...env,MEDICEA_SIMPLE_LEAFLET:'true'},reply),result=await h.load('app/lib/simple-research-leaflet.ts').simpleResearchLeaflet({...input,drugDosage:'',audience:'human',selected:null});assert.equal(result.status,200);assert.equal((await result.json()).sections.at(-1).bullets[0],'Not specified');assert.equal(h.calls.length,1);
 const incomplete=loader(null,{...env,MEDICEA_SIMPLE_LEAFLET:'true'},{status:'incomplete',output:[]});assert.equal((await incomplete.load('app/lib/simple-research-leaflet.ts').simpleResearchLeaflet({...input,drugDosage:'',audience:'human',selected:null})).status,503);assert.equal(incomplete.calls.length,1);
 const failure=loader(null,{...env,MEDICEA_SIMPLE_LEAFLET:'true',OPENAI_API_KEY_1:'second-fictional-key'},()=>{throw Error('Fictional network failure');});assert.equal((await failure.load('app/lib/simple-research-leaflet.ts').simpleResearchLeaflet({...input,drugDosage:'',audience:'human',selected:null})).status,503);assert.equal(failure.calls.length,1);
});


test('leaflet bullets stay readable while citation URLs move to a closed source disclosure',()=>{
 const h=loader(),Component=h.load('app/components/StructuredLeafletSections.tsx').default;
 const sections=[{key:'Strength',bullets:['400 mg per tablet. ([spididol.it](https://www.spididol.it/leaflet.pdf))','See [product leaflet](https://www.spididol.it/leaflet.pdf).']},{key:'Average Selling Price',bullets:['12 tablets · 8.29 EUR · Italy · https://pharmacy.example/pack']}];
 const original=JSON.stringify(sections),html=renderToStaticMarkup(React.createElement(Component,{sections})),body=html.split('<details')[0];
 assert.doesNotMatch(body,/https?:|\[spididol|<a /);assert.match(body,/400 mg per tablet/);assert.match(body,/product leaflet/);assert.match(body,/8.29 EUR/);assert.doesNotMatch(body,/\(\s*\)/);
 assert.match(html,/<summary[^>]*>Sources \(2\)<\/summary>/);assert.doesNotMatch(html,/<details[^>]* open/);assert.equal((html.match(/href=/g)||[]).length,2);assert.equal(JSON.stringify(sections),original);
 const unsafe=renderToStaticMarkup(React.createElement(Component,{sections:[{key:'Precautions',bullets:['Check pack https://user:secret@example.com/pack']}],lang:'it'}));assert.doesNotMatch(unsafe,/href=|user:secret/);
});
