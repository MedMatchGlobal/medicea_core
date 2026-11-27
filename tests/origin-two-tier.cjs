const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
function loader(env={},overrides={}){
 const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch:()=>{throw Error('Unexpected network');},Response,Request,Headers,AbortController,URL,Buffer,Date,Error,SyntaxError,TypeError,setTimeout,clearTimeout,console:{...console,info(){}},require:name=>overrides[name]||(name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name))});return cache[file]=module.exports;};
}
const env={ANTHROPIC_API_KEY:'test-key'};
const src='https://www.medicines.org.uk/emc/product/1/smpc';
const apis=[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate hemihydrate',strength:'12.8 mg'}];
const identification={query_type:'brand_product',variants_complete:false,profiles:[{product_name:'Solpadeine Max Tablets',apis,form:'tablet',route:'oral',sources:[src],status:'confirmed'}],unverified:[{product_name:'Solpadeine Max Soluble Tablets',apis:[...apis,{name:'Caffeine',strength:'30 mg'}],form:'effervescent tablet',route:null,sources:[src],missing_fields:['route']},{product_name:'Solpadeine Nameless',apis:[],form:null,route:null,sources:[],missing_fields:['form','route']}]};
const verified={profiles:[{product_name:'Solpadeine Max Soluble Tablets',apis:[...apis,{name:'Caffeine',strength:'30 mg'}],form:'effervescent tablet',route:'oral',legal_status:'pharmacy-only',marketing_authorisation_holder:'Omega Pharma Ltd',marketed:'yes',sources:[src],field_status:{apis:'stated',strength:'stated',form:'stated',route:'stated'},mismatch:false}]};
function runtime(research){return loader(env,{'./openaiClient':{openaiFetch:()=>{throw Error('OpenAI must not be called');}},'./claude-preview':{claudePreviewEnabled:()=>true,claudeResearch:research}});}
async function identify(){
 const read=runtime(async()=>identification);
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Solpadeine Max',originCountry:'United Kingdom',targetCountry:'United Kingdom'},true);
 return {read,body:await response.json(),status:response.status};
}
test('a named, source-linked candidate with a missing field is selectable but pending; unsourced ones are not',async()=>{
 const {body,status}=await identify();assert.equal(status,200);
 assert.deepEqual(body.variants.map(v=>[v.name,!!v.pending]),[['Solpadeine Max Tablets',false],['Solpadeine Max Soluble Tablets',true]]);
 const pending=body.variants[1];assert.equal(pending.route,'unknown');assert.ok(pending.token);assert.deepEqual(pending.missingFields,['route']);
 assert.ok(!(body.unconfirmedVariants||[]).some(v=>v.name==='Solpadeine Max Soluble Tablets'),'no duplicate note card');
});
test('a pending token can never launch an equivalence search or leaflet',async()=>{
 const {read,body}=await identify();
 const response=await read('app/lib/sonnet-research-matches.ts').productionStrengthSearch({drugName:'Solpadeine Max',originCountry:'United Kingdom',targetCountry:'Italy',originSelection:body.variants[1].token});
 assert.equal(response.status,422);assert.equal((await response.json()).error,'ORIGIN_SELECTION_EXPIRED');
});
test('verification reads the official document and returns a normal verified selection',async()=>{
 const {read,body}=await identify();let sent;
 const verify=runtime(async(instruction,data,deadline,options)=>{sent={instruction,data,options};return verified;});
 // Same signing secret across runtimes: tokens are provider-independent.
 const response=await verify('app/lib/sonnet-research-matches.ts').verifyOriginSelection({drugName:'Solpadeine Max',originCountry:'United Kingdom',originSelection:body.variants[1].token});
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.verified,true);
 assert.equal(sent.options.fullDocuments,true);assert.equal(typeof sent.data,'string');assert.ok(sent.data.includes('- '+src),'candidate URLs are plain text lines');
 assert.equal(result.variant.route,'oral');assert.equal(result.variant.name,'Solpadeine Max Soluble Tablets');assert.equal(result.legalStatus,'pharmacy-only');assert.equal(result.marketed,'yes');assert.equal(result.marketingAuthorisationHolder,'Omega Pharma Ltd');
 const support=verify('app/lib/sonnet-research-support.ts');const profile=support.readOriginSelection(result.variant.token,'Solpadeine Max','United Kingdom','');
 assert.equal(profile.complete,true);assert.notEqual(profile.pending,true);
});
test('placeholder strengths on a pending candidate ("not stated") are not treated as known strengths',async()=>{
 const r=runtime(async()=>({profiles:[{...verified.profiles[0],product_name:'Solpadeine Max Tablets',apis,form:'tablet'}]}));
 const support=r('app/lib/sonnet-research-support.ts');
 const token=support.issueOriginSelection({name:'Solpadeine Max Tablets',country:'United Kingdom',form:'tablet',route:'Not confirmed',release:'unknown',species:[],complete:false,generic:false,ingredients:[{name:'Paracetamol',strength:'not stated'},{name:'Codeine phosphate hemihydrate',strength:'not stated'}],sources:[src],lookup:'original',pending:true},'Solpadeine Max');
 const res=await r('app/lib/sonnet-research-matches.ts').verifyOriginSelection({drugName:'Solpadeine Max',originCountry:'United Kingdom',originSelection:token});
 const out=await res.json();assert.equal(res.status,200,JSON.stringify(out));assert.equal(out.verified,true);
});
test('unstated fields, mismatches, expired or non-pending tokens and provider errors never produce a verified product',async()=>{
 const {body}=await identify();const token=body.variants[1].token;const input={drugName:'Solpadeine Max',originCountry:'United Kingdom',originSelection:token};
 const call=async(reply,over={})=>{const r=runtime(typeof reply==='function'?reply:async()=>reply);const res=await r('app/lib/sonnet-research-matches.ts').verifyOriginSelection({...input,...over});return {status:res.status,body:await res.json()};};
 const notStated={profiles:[{...verified.profiles[0],route:null,field_status:{...verified.profiles[0].field_status,route:'not_stated'}}]};
 const noRoute=await call(notStated);assert.equal(noRoute.status,200);assert.equal(noRoute.body.variant.route,'unknown','a route the documents do not state never blocks verification and is never invented');
 const noForm={profiles:[{...verified.profiles[0],form:null,field_status:{...verified.profiles[0].field_status,form:'not_stated'}}]};
 assert.deepEqual(await call(noForm),{status:422,body:{error:'ORIGIN_VERIFICATION_INCOMPLETE'}});
 const noStrength={profiles:[{...verified.profiles[0],field_status:{...verified.profiles[0].field_status,strength:'not_stated'}}]};
 assert.deepEqual(await call(noStrength),{status:422,body:{error:'ORIGIN_VERIFICATION_INCOMPLETE'}});
 assert.deepEqual(await call({profiles:[{...verified.profiles[0],mismatch:true}]}),{status:422,body:{error:'ORIGIN_VERIFICATION_MISMATCH'}});
 const wrongStrength={profiles:[{...verified.profiles[0],apis:[{name:'Paracetamol',strength:'1000 mg'},...verified.profiles[0].apis.slice(1)]}]};
 assert.equal((await call(wrongStrength)).body.error,'ORIGIN_VERIFICATION_MISMATCH');
 assert.equal((await call(verified,{originSelection:body.variants[0].token})).body.error,'ORIGIN_SELECTION_EXPIRED');
 assert.equal((await call(verified,{originSelection:'bad.token'})).body.error,'ORIGIN_SELECTION_EXPIRED');
 assert.deepEqual(await call(async()=>{throw Error('CLAUDE_TIMEOUT');}),{status:503,body:{error:'ORIGIN_VERIFICATION_UNAVAILABLE'}});
});
test('approved prompt wording: sub-brands kept apart, record_url requested, verification never infers',()=>{
 const text=fs.readFileSync('app/lib/equivalence-research-prompt.ts','utf8');
 assert.match(text,/return one entry per sub-brand and presentation/);assert.match(text,/record_url/);assert.match(text,/brand family name \(for example "Solpadeine"\) that is registered as a product name/);assert.match(text,/If intent is genuinely ambiguous/);assert.match(text,/never guess it/);
 assert.match(text,/verify ONE medicine presentation/);assert.match(text,/Never infer any field from another product, strength, country or general knowledge/);assert.match(text,/set mismatch:true/);
});
test('every supported app language has every two-tier message',()=>{
 const langs=ts.transpileModule(fs.readFileSync('app/i18n/i18n.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText.match(/SUPPORTED_LANGS[^=]*=\s*\[([^\]]+)\]/)[1].match(/'(\w+)'/g).map(s=>s.slice(1,-1));
 assert.equal(langs.length,25);
 const read=loader({});const copy=read('app/i18n/origin-verify.ts');
 assert.deepEqual([...copy.ORIGIN_VERIFY_LANGUAGES].sort(),[...langs].sort());
 for(const lang of langs){const c=copy.originVerifyCopy(lang);assert.equal(Object.keys(c).length,8);for(const [k,v] of Object.entries(c))assert.ok(typeof v==='string'&&v.trim().length>5,lang+' '+k);if(lang!=='en')assert.notEqual(c.incomplete,copy.originVerifyCopy('en').incomplete,lang);}
});
