const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name],Response,Request,JSON,process:{env:{}}});return module.exports;}
const request=(body,origin='https://preview.test')=>new Request('https://preview.test/api/translate',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('supporting translations reject unsigned and cross-origin callers before generation',async()=>{
 let preview=true,user=null,lookups=0;
 const helper=load('lib/membership/helper-access.ts',{'./config':{membershipPreviewEnabled:()=>preview,sameOrigin:req=>req.headers.get('origin')==='https://preview.test'},'./auth':{membershipUser:async()=>{lookups++;return user;}}});
 assert.equal((await helper.helperAccess(request({},'https://evil.test'))).status,403);assert.equal(lookups,0);
 assert.equal((await helper.helperAccess(request({}))).status,401);
 user={id:'member'};assert.equal(await helper.helperAccess(request({})),null);
 preview=false;user=null;assert.equal(await helper.helperAccess(request({})),null);
});
test('both translation routes apply guards, bound input and conceal upstream errors',async()=>{
 for(const [file,valid,oversized] of [['translate',{text:'Hello',target:'Italian'},{text:'x'.repeat(4001),target:'Italian'}],['translate-json',{data:{text:'Hello'},lang:'it'},{data:{text:'x'.repeat(64001)},lang:'it'}]]){
  let denial=new Response(null,{status:401}),calls=0,throws=false;
  const route=load('app/api/'+file+'/route.ts',{'next/server':{NextResponse:Response},'@/lib/membership/helper-access':{helperAccess:async()=>denial},'@/app/lib/openaiClient':{openaiFetch:async()=>{calls++;if(throws)throw Error('private patient input or credentials');return Response.json({error:'private provider detail'},{status:500});}}});
  assert.equal((await route.POST(request(valid))).status,401);assert.equal(calls,0);
  denial=null;assert.equal((await route.POST(request(oversized))).status,400);assert.equal(calls,0);
  for(throws of [false,true]){const response=await route.POST(request(valid));assert.ok(response.status>=500);assert.equal((await response.json()).error,'TRANSLATION_UNAVAILABLE');}
 }
});
test('every account language publishes the approved refund policy and no longer claims Analytics loads',()=>{
 for(const file of fs.readdirSync('app/i18n/membership').filter(file=>file.endsWith('.json'))){
  const copy=JSON.parse(fs.readFileSync('app/i18n/membership/'+file,'utf8'));
  assert.match(copy.refundPolicy,/14/);assert.match(copy.refundPolicy,/<support\/>/);
  assert.ok(copy.cancellation.includes(copy.refundPolicy));assert.doesNotMatch(copy.privacyProviders,/OpenAI/);
  assert.match(copy.privacyProviders,/Anthropic/);assert.match(copy.privacyAnalytics,/Google Fonts/);
 }
 const layout=fs.readFileSync('app/layout.tsx','utf8');assert.doesNotMatch(layout,/googletagmanager|gtag|GATracker/);
});
