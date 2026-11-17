const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,env,imports={}){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,process:{env},require:name=>imports[name]||require(name),Response,Request,URL});return module.exports;
}
test('Account-only preview permits sign-in but does not enable search quotas or production access',async()=>{
 const config=load('lib/membership/config.ts',{VERCEL_ENV:'preview',MEDICEA_ACCOUNT_PREVIEW:'true'});
 assert.equal(config.membershipAccountEnabled(),true);assert.equal(config.membershipPreviewEnabled(),false);
 for(const env of [{VERCEL_ENV:'production'},{NODE_ENV:'production'},{VERCEL_ENV:'preview'}])assert.equal(load('lib/membership/config.ts',{MEDICEA_ACCOUNT_PREVIEW:'true',...env,...(env.VERCEL_ENV==='preview'?{MEDICEA_ACCOUNT_PREVIEW:'false'}:{})}).membershipAccountEnabled(),false);
 let calls=0;const unexpected=()=>{throw Error('Account-only mode must not meter searches');};
 const meter=load('lib/membership/meter.ts',{}, {'./config':config,'./auth':{membershipUser:unexpected},'./store':{reserve:unexpected,finish:unexpected},'./access-policy':{},'./search-result':{},'./search-grant':{}});
 const response=await meter.withMembership(async()=>{calls++;return Response.json({ok:true});},'matches')(new Request('https://preview.example/api'));
 assert.equal(response.status,200);assert.equal(calls,1);
});
test('Account-only status can return signed-out state without touching billing database',async()=>{
 const config=load('lib/membership/config.ts',{VERCEL_ENV:'preview',MEDICEA_ACCOUNT_PREVIEW:'true'});
 const unexpected=()=>{throw Error('Signed-out account must not query billing');};
 const route=load('app/api/membership/status/route.ts',{}, {'@/lib/membership/config':config,'@/lib/membership/auth':{membershipUser:async()=>null},'@/lib/membership/store':{membershipStatus:unexpected},'@/lib/membership/active-plans':{membershipPlans:unexpected},'@/lib/membership/complimentary':{isMembershipAdmin:unexpected}});
 const response=await route.GET();assert.equal(response.status,200);assert.deepEqual(await response.json(),{signedIn:false});assert.equal(response.headers.get('Cache-Control'),'no-store');
});
