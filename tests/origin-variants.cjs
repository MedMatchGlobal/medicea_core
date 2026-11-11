const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,imports={},env={}){
 const module={exports:{}};
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(output,{module,exports:module.exports,process:{env:{OPENAI_API_KEY:'test-only-key',...env}},Buffer,Date,URL,Request,Response,require:name=>imports[name]||require('./legacy-provider-stubs.cjs')(name)||require(name)});
 return module.exports;
}
const product=(strength,form='tablet')=>({name:'Example '+strength+' '+form,form,route:'oral',release:'immediate-release',ingredients:[{name:'ingredient A',strength:'500 mg'},{name:'ingredient B',strength:strength+' mg'}]});
test('all distinct strengths and forms remain selectable, while exact duplicate entries are removed',()=>{
 const {variantChoices}=load('app/lib/origin-variants.ts');
 const variants=variantChoices({variants_complete:true,products:[product(8),product(12.8),product(30),product(30,'effervescent tablet'),product(8)]},'Example','GB','');
 assert.equal(variants.length,4);
 assert.deepEqual(Array.from(variants,v=>v.ingredients[1].strength),['8 mg','12.8 mg','30 mg','30 mg']);
 assert.equal(variantChoices({variants_complete:true,products:[product(8)]},'Example','GB','').length,1);
});
test('incomplete variant sets and uncertain strengths never default to one product',()=>{
 const {variantChoices}=load('app/lib/origin-variants.ts');
 for(const reply of [{variants_complete:false,products:[product(8)]},{variants_complete:true,products:[product('8 or 30')]},{variants_complete:true,products:[{...product(8),form:''}]}])assert.throws(()=>variantChoices(reply,'Example','GB',''));
});
test('a signed choice is bound to the query, home country, hint and expiry',()=>{
 const {signVariant,readVariant}=load('app/lib/origin-variants.ts');
 const selected=signVariant(product(8),'Example','GB','500');
 assert.equal(readVariant(selected.token,'Example','GB','500').ingredients[1].strength,'8 mg');
 for(const [token,name,country,hint] of [[selected.token,'Other','GB','500'],[selected.token,'Example','IT','500'],[selected.token,'Example','GB','30'],[selected.token+'x','Example','GB','500']])assert.equal(readVariant(token,name,country,hint),null);
 const payload=JSON.parse(Buffer.from(selected.token.split('.')[0],'base64url').toString());
 payload.expires=Date.now()-1;
 const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const crypto=require('node:crypto');
 const key=crypto.createHmac('sha256','test-only-key').update('medicea-origin-variant-v1').digest();
 assert.equal(readVariant(encoded+'.'+crypto.createHmac('sha256',key).update(encoded).digest('base64url'),'Example','GB','500'),null);
});
test('identification enumerates variants without destination searches and is disabled in production',async()=>{
 const helper=load('app/lib/origin-variants.ts');let calls=0;
 const imports={
  '@/app/lib/origin-variants':helper,
  '@/app/lib/equivalent-verification':{verifyEquivalentCandidates:()=>{throw Error('Unexpected verification outside preview');}},
  '@/lib/membership/config':{membershipPreviewEnabled:()=>false},
  '@/lib/membership/auth':{membershipUser:()=>{throw Error('Unexpected auth');}},
  '@/app/lib/openaiClient':{openaiFetch:async(url,init)=>{calls++;const sent=JSON.parse(init.body);assert.deepEqual(JSON.parse(sent.messages[1].content),{drugName:'Example',originCountry:'GB'});return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({variants_complete:true,products:[product(8),product(30)]})}}]});}},
 };
 const request=()=>new Request('https://preview.example/api/openai/origin-variants',{method:'POST',headers:{origin:'https://preview.example','Content-Type':'application/json'},body:JSON.stringify({drugName:'Example',originCountry:'GB',drugDosage:''})});
 const preview=load('app/api/openai/origin-variants/route.ts',imports,{VERCEL_ENV:'preview'});
 const response=await preview.POST(request());assert.equal(response.status,200);assert.equal((await response.json()).variants.length,2);assert.equal(calls,1);
 const production=load('app/api/openai/origin-variants/route.ts',imports,{VERCEL_ENV:'production',NODE_ENV:'production'});
 assert.equal((await production.POST(request())).status,404);assert.equal(calls,1);
});
test('matching reuses the signed origin and never overwrites its amounts with the dosage hint',async()=>{
 const helper=load('app/lib/origin-variants.ts');const selected=helper.signVariant(product(8),'Example','GB','500');let calls=0;
 const route=load('app/api/openai/equivalent-search/route.ts',{
  '@/app/lib/origin-variants':helper,
  '@/app/lib/equivalent-verification':{verifyEquivalentCandidates:()=>{throw Error('Unexpected verification outside preview');}},
  '@/app/lib/equivalent-results':load('app/lib/equivalent-results.ts'),
  '@/lib/membership/meter':{withMembership:run=>run},'next/server':{NextResponse:Response},
  '@/app/lib/openaiClient':{openaiFetch:async(url,init)=>{calls++;const sent=JSON.parse(init.body);assert.equal(sent.messages[1].content,'Return preferably 10 products available in Italy that contain 500 mg of ingredient A together with 8 mg of ingredient B.');return Response.json({choices:[{message:{content:'No matches.'}}]});}},
 });
 const request=token=>new Request('https://preview.example/api/openai/equivalent-search',{method:'POST',body:JSON.stringify({drugName:'Example',originCountry:'GB',targetCountry:'Italy',drugDosage:'500',originSelection:token})});
 const response=await route.POST(request(selected.token));assert.equal(response.status,200);assert.equal((await response.json()).originProfile.active_ingredients[1].strength,'8 mg');assert.equal(calls,1);
 assert.equal((await route.POST(request(selected.token+'x'))).status,422);assert.equal(calls,1);
});
