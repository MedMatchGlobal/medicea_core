const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
function loader(env={},overrides={},fetch=()=>{throw Error('Unexpected network');}){
 const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch,Response,Request,Headers,AbortController,URL,Buffer,Date,setTimeout,clearTimeout,console,require:name=>overrides[name]||(name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name))});return cache[file]=module.exports;};
}
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'};
const source='https://regulator.example/product';
const product=(strength='30 mg',name='Example')=>({name,country:'Italy',form:'tablet',route:'oral',release:'immediate-release',species:[],complete:true,generic:false,ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate hemihydrate',strength}],sources:[source],lookup:'original'});
test('restored Sonnet research, leaflet additions and composition instructions match historical code',()=>{
 for(const [file,names] of [['app/lib/claude-preview.ts',['researchInstruction','claudeResearch','claudeCompletion','readClaudeResearch']],['app/lib/sonnet-research-matches.ts',['shape','valid','sameProductComposition','comparisonProfile','formKey','releaseKey']]]){
  const old=cp.execFileSync('git',['show','origin/experiment/claude-sonnet-preview:'+file.replace('sonnet-research-matches','production-strength-matches')],{encoding:'utf8'});
  const current=fs.readFileSync(file,'utf8');
  const extract=(text,name)=>{const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);const node=ast.statements.find(n=>n.name?.getText(ast)===name||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name));return node?.getText(ast);};
  for(const name of names)assert.equal(extract(current,name),extract(old,name),name);
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
