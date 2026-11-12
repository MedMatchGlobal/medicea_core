const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
function loader(env={},overrides={},fetch=()=>{throw Error('Unexpected network');}){
 const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch,Response,Request,Headers,AbortController,URL,Buffer,Date,Error,SyntaxError,TypeError,setTimeout,clearTimeout,console,require:name=>overrides[name]||(name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name))});return cache[file]=module.exports;};
}
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'};
const source='https://regulator.example/product';
const product=(strength='30 mg',name='Example')=>({name,country:'Italy',form:'tablet',route:'oral',release:'immediate-release',species:[],complete:true,generic:false,ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate hemihydrate',strength}],sources:[source],lookup:'original'});
test('historical research and matching instructions remain intact except the owner-approved compact pricing text',()=>{
 for(const [file,names] of [['app/lib/claude-preview.ts',['researchInstruction','claudeResearch','claudeCompletion','readClaudeResearch']],['app/lib/sonnet-research-matches.ts',['shape','valid','sameProductComposition','comparisonProfile','formKey','releaseKey']]]){
  const old=cp.execFileSync('git',['show','origin/experiment/claude-sonnet-preview:'+file.replace('sonnet-research-matches','production-strength-matches')],{encoding:'utf8'})
   .replace('Label each price with its pack, currency, product variant and source URL; it is a listed quote, not a measured average or guaranteed checkout price.','For price requests, provide only a concise indicative selling price for the exact variant and pack, with currency. Never mix pack sizes, variants, reimbursement, wholesale or retail amounts. Do not enumerate retailers or price quotes. If reliable comparable retail evidence is unavailable, say unavailable.')
   .replace('Under Average Selling Price distinguish each listed quote and its price type; never combine reimbursement, wholesale and retail amounts into an average or range.','Under Average Selling Price return at most one short line giving an approximate typical retail price or narrow supported range, currency and exact pack size for the selected variant. Do not list stores, individual quotes or long URLs in this section. Do not infer a typical price from incompatible packs or price types; if not established, write Not available.');
  const current=fs.readFileSync(file,'utf8');
  const extract=(text,name)=>{const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);const node=ast.statements.find(n=>n.name?.getText(ast)===name||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name));return node?.getText(ast);};
  for(const name of names){
   // Only the owner-approved diagnostic classification changes parser code;
   // prompt text, successful parsing and source acceptance remain protected.
   let expected=name==='readClaudeResearch'?extract(old,name).replace('const reply=JSON.parse(text);',"let reply:any;\n try{reply=JSON.parse(text);}catch{throw Error('CLAUDE_RESEARCH_JSON_INVALID');}\n if(!reply||typeof reply!=='object'||Array.isArray(reply))throw Error('CLAUDE_RESEARCH_SHAPE_INVALID');"):extract(old,name);
   if(name==='comparisonProfile')expected=expected.replace('function comparisonProfile(p:Product):Product {','function comparisonProfile(p:Product):Product {\n p=reviewedComparisonProfile(p);');
   assert.equal(extract(current,name),expected,name);
  }
 }
});
test('Sonnet medium researches the web and joins citation-separated answer blocks',async()=>{
 let calls=0;
 const read=loader(env,{},async(url,init)=>{calls++;assert.equal(url,'https://api.anthropic.com/v1/messages');const body=JSON.parse(init.body);assert.equal(body.model,'claude-sonnet-5-5');assert.equal(body.output_config.effort,'medium');assert.equal(body.tools[0].name,'web_search');assert.match(body.system,/Search the web before answering/);assert.match(body.system,/exact HTTPS URLs returned by web search/);assert.deepEqual(body.messages,[{role:'user',content:'Original input'}]);return Response.json({stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:source}]},{type:'text',text:'{"products":['},{type:'text',text:JSON.stringify(product())+']}'}]});});
 const reply=await read('app/lib/claude-preview.ts').claudeResearch('Original instruction','Original input',Date.now()+100_000);assert.equal(calls,1);assert.equal(reply.products[0].sources[0],source);
});
test('unsupported source URLs cannot qualify a medicine as sourced',()=>{
 const read=loader(env),research=read('app/lib/claude-preview.ts').readClaudeResearch;
 assert.throws(()=>research({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({products:[product()]})}]}),/CLAUDE_NO_RESEARCH/);
 assert.throws(()=>research({stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:source}]},{type:'text',text:JSON.stringify({products:[{...product(),sources:['https://invented.example/product']}]})}]}),/CLAUDE_UNSUPPORTED_PRODUCT/);
});
test('an incomplete origin catalogue still requires a choice, with no destination lookup',async()=>{
 let calls=0;const read=loader(env,{'./openaiClient':{openaiFetch:()=>{throw Error('OpenAI fallback');}},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>{calls++;return {variants_complete:false,products:[product()]};}}});
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Italy'},true);
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.requiresChoice,true);assert.equal(body.variants.length,1);assert.ok(body.variants[0].token);assert.equal(calls,1);
});
test('selected strength is retained and a sourced match survives an unresolved other brand',async()=>{
 let calls=0;const read=loader(env,{'./openaiClient':{openaiFetch:()=>{throw Error('OpenAI fallback');}},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>{calls++;return calls===1?{candidates:[product(),product('8 mg','Unknown')]}:{catalogues:[{query_name:'Example',variants_complete:true,products:[product(),product('8 mg')]},{query_name:'Unknown',variants_complete:false,products:[]}]};}}});
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(product(),'Example');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Italy',originSelection:token});
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(body.matches.length,1);assert.equal(body.matches[0].ingredients[1].strength,'30 mg');assert.equal(body.equivalentResults.verification,'source_cited_full_composition');
});
test('Anthropic key is mandatory and production cannot activate the restored workflow',async()=>{
 const noKey=loader({...env,ANTHROPIC_API_KEY:undefined})('app/lib/claude-preview.ts');await assert.rejects(()=>noKey.claudeMessage('Test',[{role:'user',content:'Test'}],false,Date.now()+1000),/CLAUDE_KEY_MISSING/);
 assert.equal(loader({...env,VERCEL_ENV:'production'})('app/lib/claude-preview.ts').claudePreviewEnabled(),false);
});

test('opt-in diagnostics explain rejections without changing results or exposing selection secrets',async()=>{
 async function run(debug){let calls=0;const candidate={...product(),ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate',strength:'30 mg'}]};
  const read=loader(env,{'./openaiClient':{openaiFetch:()=>{throw Error('OpenAI fallback');}},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>++calls===1?{candidates:[candidate]}:{catalogues:[{query_name:'Example',variants_complete:true,products:[candidate]}]}}});
  const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection({...product(),private_extra:'never-log-this'},'Example');
  return (await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Italy',originSelection:token},false,debug)).json();
 }
 const ordinary=await run(false),debug=await run(true);
 assert.deepEqual(debug.matches,ordinary.matches);assert.equal(debug.matches.length,0);assert.equal(ordinary.equivalentDebug,undefined);
 assert.equal(debug.equivalentDebug.stage,'complete');assert.equal(debug.equivalentDebug.discoveryCount,1);
 assert.deepEqual(debug.equivalentDebug.decisions[0].reasons,['INGREDIENT_NAMES_MISMATCH']);
 assert.equal(debug.equivalentDebug.decisions[0].profile.ingredients[1].name,'Codeine phosphate');
 assert.equal(debug.equivalentDebug.origin.ingredients[1].name,'Codeine phosphate hemihydrate');
 assert.doesNotMatch(JSON.stringify(debug.equivalentDebug),/test-key|token|never-log-this/);
});
test('diagnostic decisions distinguish strength and form mismatches and successful acceptance',()=>{
 const read=loader(env,{'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true}});
 const {explainCandidate}=read('app/lib/sonnet-research-matches.ts');
 assert.ok(explainCandidate(product(),product('8 mg'),'Italy').reasons.includes('STRENGTH_OR_UNIT_TEXT_DIFFERS'));
 assert.ok(explainCandidate(product(),{...product(),form:'effervescent tablet'},'Italy').reasons.includes('FORM_MISMATCH'));
 assert.equal(explainCandidate(product(),product(),'Italy').accepted,true);
 assert.equal(explainCandidate(product(),product(),'Italy').reasons.length,0);
});
test('diagnostics retain the stage and discovery data when catalogue validation fails',async()=>{
 let calls=0;const read=loader(env,{'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>++calls===1?{candidates:[product()]}:{catalogues:[]}}});
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(product(),'Example');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Italy',originSelection:token},false,true);
 const body=await response.json();assert.equal(response.status,503);assert.equal(body.diagnostic,'INCOMPLETE_CATALOGUES');assert.equal(body.equivalentDebug.stage,'destination_catalogues');assert.equal(body.equivalentDebug.discoveryCount,1);
});

test('research diagnostics distinguish malformed JSON and invalid root shape without leaking raw text',()=>{
 const research=loader(env)('app/lib/claude-preview.ts').readClaudeResearch;
 const payload=text=>({stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url:source}]},{type:'text',text}]});
 assert.throws(()=>research(payload('private-source-text {broken')),e=>e.message==='CLAUDE_RESEARCH_JSON_INVALID');
 for(const text of ['null','[]','42'])assert.throws(()=>research(payload(text)),e=>e.message==='CLAUDE_RESEARCH_SHAPE_INVALID');
 assert.equal(research(payload('{"candidates":[]}')).candidates.length,0);
});

test('provider diagnostics distinguish transport, HTTP and invalid JSON responses',async()=>{
 const run=fetch=>loader(env,{},fetch)('app/lib/claude-preview.ts').claudeMessage('Test',[{role:'user',content:'Test'}],false,Date.now()+1000);
 await assert.rejects(()=>run(async()=>{throw new TypeError('private-network-detail');}),e=>e.message==='CLAUDE_NETWORK_ERROR');
 await assert.rejects(()=>run(async()=>new Response('private-upstream-body')),e=>e.message==='CLAUDE_PROVIDER_JSON_INVALID');
 await assert.rejects(()=>run(async()=>Response.json({error:{message:'private detail'}},{status:429})),e=>e.message==='CLAUDE_HTTP_429');
});

test('unexpected destination errors retain safe codes, stage and elapsed time',async()=>{
 for(const [failure,expected] of [[new SyntaxError('private-json-fragment'),'CLAUDE_RESPONSE_JSON_INVALID'],[new TypeError('private-profile'),'CLAUDE_RESPONSE_SHAPE_INVALID'],[new Error('private-secret'),'CLAUDE_UNEXPECTED_ERROR'],[new Error('CLAUDE_PRIVATE_SECRET'),'CLAUDE_UNEXPECTED_ERROR'],[new Error('CLAUDE_RESEARCH_JSON_INVALID'),'CLAUDE_RESEARCH_JSON_INVALID']]){
  const read=loader(env,{'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async()=>{throw failure;}}});
  const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(product(),'Example');
  const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Example',originCountry:'Italy',targetCountry:'Italy',originSelection:token},false,true);
  const body=await response.json();assert.equal(response.status,503);assert.equal(body.diagnostic,expected);assert.equal(body.equivalentDebug.stage,'destination_discovery');assert.ok(body.equivalentDebug.elapsedMs>=0);assert.doesNotMatch(JSON.stringify(body),/private-|test-key/);
 }
});

const coEfferalgan=()=>({...product(),name:'Co-Efferalgan 500 mg + 30 mg compresse rivestite con film',form:'film-coated tablet',sources:['https://www.gazzettaufficiale.it/atto/parte_seconda/caricaDettaglioAtto/originario?atto.codiceRedazionale=TX22ADD12567&atto.dataPubblicazioneGazzetta=2022-11-24'],ingredients:[{name:'Paracetamol',strength:'500 mg per tablet'},{name:'Codeine phosphate',strength:'30 mg per tablet'}]});
test('reviewed label enrichment is specific, preserves label text and never converts strengths',()=>{
 const {reviewedComparisonProfile,reviewedCompositionEvidence}=loader(env)('app/lib/reviewed-composition.ts');
 const origin=coEfferalgan(),before=JSON.stringify(origin),normal=reviewedComparisonProfile(origin);
 assert.equal(normal.ingredients[1].name,'Codeine phosphate hemihydrate');assert.equal(normal.ingredients[1].strength,'30 mg per tablet');assert.equal(JSON.stringify(origin),before);assert.ok(reviewedCompositionEvidence(origin)[0].startsWith('https://www.gazzettaufficiale.it/'));
 const eff={...origin,form:'effervescent tablet',sources:['https://www.bbfarma.it/pdf/stampati/038123028.pdf']};assert.equal(reviewedCompositionEvidence(eff).length,2);
 for(const p of [
  {...origin,name:'Another brand'}, {...origin,country:'United Kingdom'}, {...origin,form:'capsule'}, {...origin,form:'tablet'}, {...origin,release:'modified-release'}, {...origin,route:'rectal'}, {...origin,sources:[]}, {...origin,sources:['https://unverified.example/brand']}, {...origin,species:['dog']}, {...origin,complete:false},
  {...origin,ingredients:[origin.ingredients[0],{name:'Codeine phosphate',strength:'8 mg per tablet'}]},
  {...origin,ingredients:[origin.ingredients[0],{name:'Codeine phosphate',strength:'30 mg per ml'}]},
  {...origin,ingredients:[origin.ingredients[0],{name:'Codeine phosphate sesquihydrate',strength:'30 mg per tablet'}]},
  {...origin,ingredients:[...origin.ingredients,{name:'Caffeine',strength:'30 mg per tablet'}]},
 ])assert.equal(reviewedComparisonProfile(p),p,'unsupported profile must not be enriched');
});

test('Co Efferalgan lookup uses reviewed chemical name and retains independently researched exact matches',async()=>{
 const origin=coEfferalgan();let calls=0;
 const correct={...product(),name:'Co-codamol 30/500 Tablets',country:'United Kingdom',ingredients:[{name:'Codeine phosphate hemihydrate',strength:'30 mg per tablet'},{name:'Paracetamol',strength:'500 mg per tablet'}]};
 const wrongStrength={...correct,name:'Co-codamol 8/500 Tablets',ingredients:[correct.ingredients[1],{name:'Codeine phosphate hemihydrate',strength:'8 mg per tablet'}]};
 const wrongForm={...correct,name:'Co-codamol 30/500 Effervescent Tablets',form:'effervescent tablet'};
 const wrongOpioid={...correct,name:'Co-codamol 30/500 Tablets',ingredients:[correct.ingredients[1],{name:'Dihydrocodeine tartrate',strength:'30 mg per tablet'}]};
 const read=loader(env,{'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async(instruction,data)=>{
  calls++;
  if(calls===1){assert.match(data,/30 mg per tablet of Codeine phosphate hemihydrate/);return {candidates:[correct]};}
  assert.deepEqual(data.query_names,['Co-codamol']);assert.equal(JSON.stringify(data).includes('30 mg'),false);
  return {catalogues:[{query_name:'Co-codamol',variants_complete:false,products:[correct,wrongStrength,wrongForm,wrongOpioid]}]};
 }}});
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(origin,'Co Efferalgan');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Co Efferalgan',originCountry:'Italy',targetCountry:'United Kingdom',originSelection:token},false,true);
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(body.matches.length,1);assert.equal(body.originProfile.active_ingredients[1].name,'Codeine phosphate');assert.equal(body.comparisonEvidence.length,1);assert.equal(body.equivalentDebug.acceptedCount,1);
 assert.ok(body.equivalentDebug.decisions.some(d=>d.reasons.includes('STRENGTH_OR_UNIT_TEXT_DIFFERS')));assert.ok(body.equivalentDebug.decisions.some(d=>d.reasons.includes('FORM_MISMATCH')));assert.ok(body.equivalentDebug.decisions.some(d=>d.reasons.includes('INGREDIENT_NAMES_MISMATCH')));
});

test('supplier queries retain product identity without copying the proposed strength or form',()=>{
 const {presentationQuery}=loader(env)('app/lib/product-presentations.ts');
 const {candidateIdentity}=loader(env,{'./openaiClient':{}})('app/lib/sonnet-research-matches.ts');
 const p={...product(),name:'Co-codamol 30/500 Effervescent Tablets',supplier:'Zentiva'};
 assert.equal(presentationQuery(p,candidateIdentity),'Co-codamol (Zentiva)');
 assert.equal(presentationQuery({...p,supplier:'Cipla EU Ltd'},candidateIdentity),'Co-codamol (Cipla EU Ltd)');
 assert.equal(presentationQuery({...p,supplier:undefined},candidateIdentity),'Co-codamol');
});

test('four sourced presentations survive the independent catalogue lookup while duplicates and mismatches do not',async()=>{
 const origin={...coEfferalgan(),name:'Co-Efferalgan 500 mg + 30 mg compresse effervescenti',form:'effervescent tablet',sources:['https://www.bbfarma.it/pdf/stampati/038123028.pdf']};
 const ingredients=[{name:'Paracetamol',strength:'500 mg per tablet'},{name:'Codeine phosphate hemihydrate',strength:'30 mg per tablet'}];
 const make=(name,supplier,url,id)=>({...product(),name,supplier,country:'United Kingdom',generic:name.startsWith('Co-'),form:'effervescent tablet',ingredients,sources:[url],...(id?{product_identifier:{system:'MHRA PL',value:id}}:{})});
 const zentiva=make('Co-codamol 30/500 Effervescent Tablets','Zentiva','https://www.medicines.org.uk/emc/product/464/smpc','17780/0046');
 const cipla=make('Co-codamol 30mg/500mg effervescent tablets','Cipla EU Ltd','https://www.medicines.org.uk/emc/product/10158/smpc');
 const accord=make('Co-codamol 30mg/500mg effervescent tablets','Accord-UK Ltd','https://www.accord-healthcare-products.co.uk/products/c/co-codamol-tablets');
 const solpadol=make('Solpadol 30mg/500mg effervescent tablets','Phoenix Labs Ltd','https://openprescribing.net/dmd/vmp/42009711000001109/');
 const duplicate={...zentiva,name:'Co-codamol 30mg/500mg effervescent tablets',sources:['https://www.medicines.org.uk/emc/medicine/22736']};
 const group={...zentiva,supplier:undefined,product_identifier:undefined};
 const wrongStrength={...zentiva,name:'Co-codamol 8/500 Effervescent Tablets',ingredients:[ingredients[0],{...ingredients[1],strength:'8 mg per tablet'}]};
 const wrongForm={...zentiva,name:'Co-codamol 30/500 Tablets',form:'tablet'};
 const wrongOpioid={...zentiva,ingredients:[ingredients[0],{name:'Dihydrocodeine tartrate',strength:'30 mg per tablet'}]};
 const candidates=[group,zentiva,cipla,accord,solpadol];let calls=0;
 const read=loader(env,{'./openaiClient':{},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:async(instruction,data)=>{
  calls++;assert.match(instruction,/supplier presentation separately/);assert.match(instruction,/Never invent or copy/);
  if(calls===1)return {candidates};
  assert.deepEqual(JSON.parse(JSON.stringify(data)),{country:'United Kingdom',query_names:['Co-codamol','Co-codamol (Zentiva)','Co-codamol (Cipla EU Ltd)','Co-codamol (Accord-UK Ltd)','Solpadol (Phoenix Labs Ltd)']});
  // Generic catalogue deliberately returns the independently researched branded
  // alternative too. Supplier-specific rows must still match that supplier.
  return {catalogues:data.query_names.map(query=>({query_name:query,variants_complete:false,products:query==='Co-codamol'?[group,solpadol]:query==='Co-codamol (Zentiva)'?[zentiva,duplicate,wrongStrength,wrongForm,wrongOpioid,cipla]:query==='Co-codamol (Cipla EU Ltd)'?[cipla]:query==='Co-codamol (Accord-UK Ltd)'?[accord]:[solpadol]}))};
 }}});
 const token=read('app/lib/sonnet-research-support.ts').issueOriginSelection(origin,'Co Efferalgan');
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Co Efferalgan',originCountry:'Italy',targetCountry:'United Kingdom',originSelection:token},false,true);
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(body.matches.length,4);
 assert.deepEqual(body.matches.map(p=>p.supplier).sort(),['Accord-UK Ltd','Cipla EU Ltd','Phoenix Labs Ltd','Zentiva']);
 const z=body.matches.find(p=>p.supplier==='Zentiva');assert.equal(z.product_identifier.value,'17780/0046');assert.equal(z.sources.length,2);assert.match(z.medicine_name,/Zentiva/);
 assert.ok(body.matches.some(p=>p.medicine_name.startsWith('Solpadol')));
 for(const reason of ['SUPPLIER_IDENTITY_MISMATCH','STRENGTH_OR_UNIT_TEXT_DIFFERS','FORM_MISMATCH','INGREDIENT_NAMES_MISMATCH'])assert.ok(body.equivalentDebug.decisions.some(d=>d.reasons.includes(reason)),reason);
});

test('product deduplication never merges different suppliers or distinct known national identifiers',()=>{
 const {deduplicatePresentations,productIdentifierOf,supplierOf}=loader(env)('app/lib/product-presentations.ts');
 const row={...product(),supplier:'Supplier A',product_identifier:{system:'dm+d AMP',value:'123'}};
 const rows=[row,{...row,product_identifier:{system:'dm+d AMP',value:'456'}},{...row,supplier:'Supplier B'}];
 assert.equal(deduplicatePresentations(rows,()=> 'same clinical profile',()=> 'Example').length,3);
 assert.equal(productIdentifierOf({product_identifier:{system:'dm+d',value:'<invalid>'}}),undefined);assert.equal(supplierOf({supplier:'bad\nmetadata'}),undefined);
 assert.equal(productIdentifierOf({product_identifier:{system:'dm+d VMP',value:'42009711000001109'}}),undefined);
});
