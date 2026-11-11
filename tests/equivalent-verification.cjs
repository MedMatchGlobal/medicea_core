const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},env={}){const module={exports:{}};const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(output,{module,exports:module.exports,process:{env},Request,Response,require:name=>imports[name]||require(name)});return module.exports;}
const variants=load('app/lib/origin-variants.ts');
const helpers=load('app/lib/equivalent-results.ts');
const product=(strength='30 mg',extra={})=>({name:'Example',form:'tablet',route:'oral',release:'immediate-release',ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate hemihydrate',strength}],...extra});
const imports=provider=>({'./origin-variants':variants,'./equivalent-results':helpers,'./openaiClient':{openaiFetch:provider}});
const lib=load('app/lib/equivalent-verification.ts',imports());
test('compares the complete ingredient-to-amount mapping, independent of order and formatting',()=>{
 const origin=product();
 assert.equal(lib.sameFormulation(origin,product('30mg',{form:'film-coated tablet',release:'immediate',ingredients:[{name:'codeine phosphate hemihydrate',strength:'30 mg per tablet'},{name:'PARACETAMOL',strength:'500.0mg'}]})),true);
 for(const wrong of [product('8 mg'),product('12.8 mg'),product('30 mcg'),product('30 mg/ml'),product('30 mg',{form:'effervescent tablet'}),product('30 mg',{form:'soluble tablet'}),product('30 mg',{release:'modified-release'}),product('30 mg',{route:'rectal'}),product('30 mg',{ingredients:[{name:'Paracetamol',strength:'500 mg'}]}),product('30 mg',{ingredients:[...origin.ingredients,{name:'Caffeine',strength:'30 mg'}]}),product('30 mg',{ingredients:[{name:'Paracetamol',strength:'500 mg'},{name:'Codeine phosphate',strength:'30 mg'}]}),product('30 mg',{ingredients:[origin.ingredients[0],origin.ingredients[0]]})])assert.equal(lib.sameFormulation(origin,wrong),false,JSON.stringify(wrong));
});
test('looks up brand identities without copying proposed dose and form',()=>{
 assert.equal(lib.candidateQuery('Example 30/500 Tablets'),'Example');
 assert.equal(lib.candidateQuery('Example 500 mg effervescent tablets'),'Example');
});
test('names-only candidates survive only after lookup reports a matching actual formulation',async()=>{
 let calls=0;
 const verifier=load('app/lib/equivalent-verification.ts',imports(async(url,init)=>{
  calls++;const sent=JSON.parse(init.body),input=JSON.parse(sent.messages[1].content);
  assert.deepEqual(input,{country:'Italy',query_names:['Example']});
  assert.doesNotMatch(sent.messages[1].content,/Paracetamol|Codeine|30|500|United Kingdom/);
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({catalogues:[{query_name:'Example',country:'Italy',variants_complete:true,products:[product('8 mg'),product(),product('30 mg',{form:'effervescent tablet'})]}]})}}]});
 }));
 const matches=await verifier.verifyEquivalentCandidates('1. Example 30/500 Tablets','Italy',product());
 assert.equal(calls,1);assert.equal(matches.length,1);assert.equal(matches[0].ingredients[1].strength,'30 mg');assert.equal(matches[0].form,'tablet');
});
test('invented desired strengths cannot pass when actual lookup reports a different strength',()=>{
 const reply={catalogues:[{query_name:'Example',country:'Italy',variants_complete:true,products:[product()]}]};
 assert.equal(lib.verifiedProfiles(reply,['Example'],'Italy',product('8 mg')).length,0);
});
test('incomplete, mismatched and uncertain catalogues fail instead of reporting false absence',()=>{
 for(const reply of [{catalogues:[]},{catalogues:[{query_name:'Other',country:'Italy',variants_complete:true,products:[product()]}]},{catalogues:[{query_name:'Example',country:'United Kingdom',variants_complete:true,products:[product()]}]},{catalogues:[{query_name:'Example',country:'Italy',variants_complete:false,products:[]}]},{catalogues:[{query_name:'Example',country:'Italy',variants_complete:true,products:[product('30 mg',{name:'Other'})]}]}])assert.throws(()=>lib.verifiedProfiles(reply,['Example'],'Italy',product()));
});
test('refusals do not trigger a verification lookup and truncated provider replies fail',async()=>{
 let calls=0;
 const verifier=load('app/lib/equivalent-verification.ts',imports(async()=>{calls++;return Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]});}));
 assert.equal((await verifier.verifyEquivalentCandidates('Sorry, I cannot help.','Italy',product())).length,0);assert.equal(calls,0);
 await assert.rejects(()=>verifier.verifyEquivalentCandidates('1. Example','Italy',product()));assert.equal(calls,1);
});

test('the preview route returns looked-up candidates and never recovers rejected raw names',async()=>{
 let discoveryCalls=0,lookupCalls=0;
 const origin=product();
 const verifier=load('app/lib/equivalent-verification.ts',imports(async()=>{
  lookupCalls++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({catalogues:[{query_name:'Example',country:'Italy',variants_complete:true,products:[product()]},{query_name:'Wrong',country:'Italy',variants_complete:true,products:[product('8 mg',{name:'Wrong'})]}]})}}]});
 }));
 const route=load('app/api/openai/equivalent-search/route.ts',{
  '@/app/lib/origin-variants':{readVariant:()=>origin},
  '@/app/lib/equivalent-results':helpers,
  '@/app/lib/equivalent-verification':verifier,
  '@/lib/membership/meter':{withMembership:run=>run},'next/server':{NextResponse:Response},
  '@/app/lib/openaiClient':{openaiFetch:async(url,init)=>{discoveryCalls++;const sent=JSON.parse(init.body);assert.equal(sent.messages[1].content,'Return preferably 10 products available in Italy that contain 500 mg of Paracetamol together with 30 mg of Codeine phosphate hemihydrate.');return Response.json({choices:[{message:{content:'1. Example\n2. Wrong'}}]});}},
 },{VERCEL_ENV:'preview'});
 const response=await route.POST(new Request('https://preview.example/api',{method:'POST',body:JSON.stringify({drugName:'Origin',originCountry:'United Kingdom',targetCountry:'Italy',originSelection:'test-token'})}));
 const body=await response.json();
 assert.equal(response.status,200);assert.equal(discoveryCalls,1);assert.equal(lookupCalls,1);
 assert.deepEqual(body.matches.map(p=>p.medicine_name),['Example']);
 assert.equal(body.matches[0].ingredients[1].strength,'30 mg');
 assert.equal(body.equivalentResults.raw_text,'- Example');
 assert.equal(body.equivalentResults.verification,'model_generated_full_composition');
});
