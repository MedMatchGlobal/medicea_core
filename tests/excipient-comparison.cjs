const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function loader(overrides={}){const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,process:{env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'}},Response,URL,Buffer,Date,Error,TypeError,SyntaxError,console,setTimeout,clearTimeout,require:name=>overrides[name]||(name.startsWith('.')?read(path.join(path.dirname(file),name+(fs.existsSync(path.join(path.dirname(file),name+'.ts'))?'.ts':'.tsx'))):require(name))});return cache[file]=module.exports;};}
const read=loader(),lib=read('app/lib/excipient-comparison.ts'),url='https://regulator.example/leaflet';
const evidence=(name,items,status='complete',documentDate='2026-10-01')=>({productName:name,status,items:items.map(i=>typeof i==='string'?{name:i}:i),sources:[url],documentDate});
const product=(name,items,status='complete')=>({name,country:'Italy',form:'tablet',route:'oral',release:'immediate-release',species:[],complete:true,generic:false,ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate hemihydrate',strength:'8 mg'},{name:'Caffeine',strength:'30 mg'}],sources:[url],...(items?{excipientEvidence:evidence(name,items,status)}:{})});

test('complete declared lists compare without inventing quantity equivalence or chemical aliases',()=>{
 const a=product('Origin',['Lactose monohydrate','Starch']),b=product('Candidate',['starch',' lactose monohydrate ']);
 const same=lib.compareExcipients(a,b);assert.equal(same.status,'listed_match');assert.equal(same.amounts,'unknown');
 const different=lib.compareExcipients(a,product('Other',['Lactose','Starch']));assert.equal(different.status,'different');assert.deepEqual([...different.originOnly],['Lactose monohydrate']);assert.deepEqual([...different.candidateOnly],['Lactose']);
});
test('quantities compare only explicit numeric declarations, with units and dose basis retained',()=>{
 const a=product('Origin',[{name:'Sodium',amount:'10.0 mg per tablet'}]);
 assert.equal(lib.compareExcipients(a,product('A',[{name:'Sodium',amount:'10mg/tablet'}])).amounts,'match');
 const diff=lib.compareExcipients(a,product('B',[{name:'Sodium',amount:'20 mg per tablet'}]));assert.equal(diff.status,'different');assert.equal(diff.amounts,'different');
 assert.equal(lib.compareExcipients(a,product('C',[{name:'Sodium',amount:'10 mg per ml'}])).status,'different');
 assert.equal(lib.compareExcipients(a,product('D',[{name:'Sodium',amount:'Not available'}])).status,'incomplete');
});
test('unknown, partial, malformed or wrong-product evidence never becomes a complete-list match',()=>{
 const a=product('Origin',['Lactose']);
 for(const b of [product('Unknown'),product('Partial',['Lactose'],'partial'),product('Empty',[]),{...product('Wrong',['Lactose']),excipientEvidence:evidence('Another product',['Lactose'])},{...product('Unsafe',['Lactose']),excipientEvidence:{...evidence('Unsafe',['Lactose']),sources:['https://invented.example/leaflet']}},{...product('Bad',['Lactose']),excipientEvidence:{...evidence('Bad',['Lactose']),items:[{name:'Lactose'},{name:'<script>bad</script>'}]}}])assert.equal(lib.compareExcipients(a,b).status,'incomplete');
 assert.equal(lib.compareExcipients(product('Unknown'),product('Unknown too')).status,'incomplete');
});
test('rank is complete listed match, differences, incomplete, then document date; no medical score',()=>{
 const a=product('Origin',['Starch']);
 const rows=[product('Unknown'),product('Different',['Lactose']),product('Older',['Starch']),{...product('Newer',['Starch']),excipientEvidence:evidence('Newer',['Starch'],'complete','2026-11-01')}].map(p=>({name:p.name,excipientComparison:lib.compareExcipients(a,p)}));
 assert.deepEqual([...lib.rankExcipientComparisons(rows)].map(p=>p.name),['Newer','Older','Different','Unknown']);
 const future=product('Future',['Starch']);future.excipientEvidence.documentDate='2099-01-01';assert.equal(lib.excipientEvidenceFor(future).documentDate,undefined);
});
test('duplicate presentations preserve evidence and flag conflicting declarations',()=>{
 const {deduplicatePresentations}=read('app/lib/product-presentations.ts');
 const a=product('Candidate',['Lactose']),b=product('Candidate',['Starch']);
 const [merged]=deduplicatePresentations([a,b],()=> 'same clinical identity',()=> 'Candidate');
 assert.equal(merged.excipientEvidence.status,'partial');assert.equal(lib.compareExcipients(product('Origin',['Lactose']),merged).status,'incomplete');
 const [kept]=deduplicatePresentations([product('Candidate'),a],()=> 'same clinical identity',()=> 'Candidate');assert.equal(kept.excipientEvidence.status,'complete');
});
test('matching ranks only accepted complete-API products and does not add research calls',async()=>{
 const origin=product('Origin',['Starch']);const same=product('Same',['Starch']),different=product('Different',['Lactose']),unknown=product('Unknown');
 const negatives=[{...same,name:'Missing API',ingredients:same.ingredients.slice(0,2)},{...same,name:'Extra API',ingredients:[...same.ingredients,{name:'Ibuprofen',strength:'200 mg'}]},{...same,name:'Wrong API',ingredients:[same.ingredients[0],{name:'Dihydrocodeine tartrate',strength:'8 mg'},same.ingredients[2]]},{...same,name:'Wrong strength',ingredients:[same.ingredients[0],{name:'Codeine phosphate hemihydrate',strength:'30 mg'},same.ingredients[2]]},{...same,name:'Wrong form',form:'capsule'},{...same,name:'Wrong route',route:'rectal'},{...same,name:'Wrong release',release:'modified-release'}].map(p=>({...p,excipientEvidence:evidence(p.name,['Starch'])}));
 let calls=0;const runtime=loader({'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async(instruction,data)=>{
  calls++;
  if(calls===1){assert.match(instruction,/excipientEvidence/);return {variants_complete:true,products:[origin]};}
  if(calls===2){assert.doesNotMatch(instruction,/Also return excipientEvidence/);return {candidates:[unknown,different,same]};}
  assert.match(instruction,/excipientEvidence/);return {catalogues:data.query_names.map(name=>({query_name:name,variants_complete:true,products:name==='Same'?[same,...negatives]:name==='Different'?[different]:[unknown]}))};
 }}});
 const response=await runtime('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Origin',originCountry:'Italy',targetCountry:'Italy'});
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,3);assert.equal(body.matches.length,3);assert.deepEqual(body.matches.map(p=>p.excipientComparison.status),['listed_match','different','incomplete']);assert.equal(body.matches[0].excipientComparison.origin.productName,'Origin');
});
test('origin chooser retains suppliers with the same APIs but different excipient lists',async()=>{
 const a={...product('Origin',['Starch']),supplier:'A'},b={...product('Origin',['Lactose']),supplier:'B'};
 const runtime=loader({'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>({variants_complete:true,products:[a,b]})}});
 const response=await runtime('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Origin',originCountry:'Italy',targetCountry:'Italy'},true);
 const body=await response.json();assert.equal(body.requiresChoice,true);assert.equal(body.variants.length,2);assert.ok(body.variants.every(p=>p.token));
});
test('saved search retains bounded evidence and recomputes forged comparison flags',()=>{
 const {normalizeSavedSearch}=read('app/lib/saved-searches.ts');
 const comparison=lib.compareExcipients(product('Origin',['Starch']),product('Candidate'));
 const entry={id:'one',savedAt:'2026-11-01T10:00:00Z',mode:'international',selectedDrug:'Origin',matches:[{medicine_name:'Candidate',excipientComparison:{...comparison,status:'listed_match',privateNote:'not saved'}}]};
 const saved=normalizeSavedSearch(entry);assert.equal(saved.matches[0].excipientComparison.status,'incomplete');assert.doesNotMatch(JSON.stringify(saved),/privateNote|not saved/);
 assert.equal(lib.restoreExcipientComparison({...comparison,checkedAt:'2099-01-01'}),undefined);
});
test('result panel exposes differences, provenance and unknowns without a suitability guarantee',()=>{
 const Panel=read('app/components/ExcipientComparison.tsx').default;
 const comparison=lib.compareExcipients(product('Origin',['Starch']),product('Candidate',['Lactose']));
 const html=renderToStaticMarkup(React.createElement(Panel,{comparison}));
 for(const word of ['Excipients differ','Lactose','Starch','View comparison details','Document date','pharmacist','not a regulatory bioequivalence assessment'])assert.ok(html.includes(word),word);
 const [compact,details]=html.split('<details');assert.match(compact,/Ingredients and strengths match/);assert.doesNotMatch(compact,/Document date|source-linked comparison|quantities|pharmacist/);assert.match(details,/Document date/);
 const missing=renderToStaticMarkup(React.createElement(Panel,{comparison:lib.compareExcipients(product('Origin'),product('Candidate'))}));assert.match(missing,/Missing information does not mean an ingredient is absent/);assert.doesNotMatch(missing,/Listed excipients match/);
});
