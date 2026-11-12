const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,fetch=()=>{throw Error('Unexpected network');}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,URL,Date,Response,Request,Headers,AbortController,setTimeout,clearTimeout,console,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'}},fetch,require:n=>n.startsWith('.')?load(path.join(path.dirname(file),n+(fs.existsSync(path.join(path.dirname(file),n+'.ts'))?'.ts':'.tsx')),fetch):require(n)});return module.exports;}
const {parseReadableLeaflet}=load('app/lib/readable-leaflet.ts');
const Panel=load('app/components/HumanMedicineLeaflet.tsx').default;
const profile={ingredients:[{name:'Paracetamol',strength:'500 mg per tablet'},{name:'Codeine phosphate',strength:'30 mg per tablet'}],form:'effervescent tablet',route:'oral',release:'immediate-release'};
const raw=`Summary:
A short educational overview.
Active Ingredients:
- Paracetamol 500 mg
- Codeine phosphate 30 mg
Strength:
500 mg + 30 mg per tablet.
Formulation:
Effervescent tablet.
Precautions:
Read the manufacturer's warning. Note that other ingredients can matter.
- Important safety information.
The strength is recorded above.
Average Selling Price:
Approximately €9–11 for a pack of 16 tablets.
Note:
The exact manufacturer should be checked.
Sources:
- [Product information](https://regulator.example/leaflet.pdf)
`;
test('whole-line headings preserve both APIs and do not split plural or sentence fragments',()=>{
 const view=parseReadableLeaflet(raw);
 assert.equal(view.sections.find(s=>s.key==='Active Ingredients').text,'- Paracetamol 500 mg\n- Codeine phosphate 30 mg');
 const safety=view.sections.find(s=>s.key==='Precautions').text;assert.match(safety,/Note that other ingredients/);assert.match(safety,/strength is recorded/);
 assert.equal(view.price,'Approximately €9–11 for a pack of 16 tablets.');assert.equal(view.notes.filter(s=>s.key==='Note').length,1);
});
test('Summary and Formulation are retained, repeated notes never leak into the price field',()=>{
 const view=parseReadableLeaflet(raw.replace('Read the manufacturer', 'Read the manufacturer')+'Note:\nA second source qualification.');
 assert.equal(view.sections[0].key,'Summary');assert.ok(view.sections.some(s=>s.key==='Formulation'));
 assert.equal(view.price,'Approximately €9–11 for a pack of 16 tablets.');assert.equal(view.notes.filter(s=>s.key==='Note').length,2);
});
test('raw URLs move to references without mining strengths or prices out of a link',()=>{
 const view=parseReadableLeaflet('Active Ingredients:\nATC code (https://example.org/drug-500mg-30mg-9-eur).\nStrength:\nEffervescent tablets (https://example.org/form.pdf).\nAverage Selling Price:\nOfficial leaflets: https://example.org/prices-9-eur/');
 assert.equal(view.sources.length,3);assert.equal(view.price,'Price unavailable');assert.doesNotMatch(JSON.stringify(view.sections),/https:\/\//);assert.doesNotMatch(view.sections[0].text,/500mg/);
});
test('inline markdown link labels retain meaningful ingredient amounts',()=>{
 const view=parseReadableLeaflet('Active Ingredients:\n- [Paracetamol 500 mg](https://regulator.example/p)\n- [Codeine phosphate 30 mg](https://regulator.example/c)');
 assert.match(view.sections[0].text,/Paracetamol 500 mg/);assert.match(view.sections[0].text,/Codeine phosphate 30 mg/);assert.equal(view.sources.length,2);
});
test('selected origin and equivalent profiles explicitly render every API and strength',()=>{
 for(const p of [profile,{...profile,ingredients:[...profile.ingredients,{name:'Caffeine',strength:'30 mg per tablet'}]}]){
  const html=renderToStaticMarkup(React.createElement(Panel,{text:'Active Ingredients:\nATC code only.\nStrength:\nEffervescent tablets.',profile:p}));
  for(const i of p.ingredients){assert.ok(html.includes(i.name));assert.ok(html.includes(i.strength));}
  assert.match(html,/Selected medicine composition/);assert.match(html,/effervescent tablet/);assert.match(html,/Price unavailable/);
 }
});
test('prose and bullets both survive; URLs and technical source notes are collapsed',()=>{
 const html=renderToStaticMarkup(React.createElement(Panel,{text:raw,profile}));
 assert.match(html,/Important safety information/);assert.match(html,/Read the manufacturer/);assert.match(html,/strength is recorded above/);
 const [visible,details]=html.split('<details');assert.doesNotMatch(visible,/https:\/\/|exact manufacturer should be checked/);assert.match(details,/https:\/\/regulator.example\/leaflet.pdf/);assert.match(details,/Product information/);assert.match(details,/exact manufacturer should be checked/);
});
test('price must be a short supported retail-style monetary and pack statement',()=>{
 for(const body of ['Price unavailable','Official leaflets: https://example.org/leaflet','Wholesale £5 for 100 tablets','Not available. Prices differ by variant: €9 for 16 tablets','Some product has strength 500 mg'])assert.equal(parseReadableLeaflet('Average Selling Price:\n'+body).price,'Price unavailable');
 assert.equal(parseReadableLeaflet('Typical Selling Price: Approximately £12 for 100 tablets.').price,'Approximately £12 for 100 tablets.');
});
test('unsafe links cannot become source anchors and supplied text is escaped',()=>{
 const html=renderToStaticMarkup(React.createElement(Panel,{text:'Summary:\n<script>alert(1)</script>\nSources:\nhttps://user:secret@example.org/p'}));
 assert.doesNotMatch(html,/<script>|href="https:\/\/user:secret/);
});
test('owner-authorised format addition reaches human leaflet requests but not translation',async()=>{
 const requests=[];
 const {claudeCompletion}=load('app/lib/claude-preview.ts',async(url,init)=>{const body=JSON.parse(init.body);requests.push(body);return Response.json({stop_reason:'end_turn',content:[...(body.tools?[{type:'web_search_tool_result',content:[{type:'web_search_result',url:'https://regulator.example/p'}]}]:[]),{type:'text',text:'{"leaflet_text":"Summary:\\nExample"}'}]});});
 const send=system=>claudeCompletion('https://api.openai.com/v1/chat/completions',{body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:'Public test product'}]})});
 await send('You write medicine leaflets. Return JSON with leaflet_text.');await send('You are a precise medical translator. Return JSON with leaflet_text.');
 assert.match(requests[0].system,/EVERY active ingredient/);assert.match(requests[0].system,/actual source URLs ONLY under Sources/);assert.match(requests[0].system,/ONE short line/);assert.match(requests[0].system,/never substitute reimbursement/i);
 assert.doesNotMatch(requests[1].system,/focused price lookup|EVERY active ingredient/);assert.equal(requests[0].model,'claude-sonnet-5-5');assert.equal(requests[0].output_config.effort,'medium');
});
test('both leaflet views use the same renderer, chosen origin button is removed, equivalent hint uses its own strengths',()=>{
 const code=fs.readFileSync('app/MedicineWorkspace.tsx','utf8');assert.match(code,/renderLeafletPretty\(extractLeafletText\(leafletRaw\), t, originProduct\|\|undefined\)/);assert.match(code,/renderLeafletPretty\(extractLeafletText\(leafletText\), t,m\)/);assert.doesNotMatch(code,/originChoiceHistory.current.length>1&&<button/);assert.match(code,/drugDosage: profile\?\.ingredients\?\.map/);
});
