const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
function load(file,imports={},env={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>imports[n]||require(n),process:{env},Date,Response,Request});return module.exports;}
const access=load('lib/membership/complimentary.ts',{'./store':{}},{MEDICEA_MEMBERSHIP_ADMIN_EMAIL:'Owner@example.test'});
test('owner access fails closed; email matching is exact, case insensitive and never accepts metadata',()=>{
 assert.equal(access.isMembershipAdmin({email:'OWNER@example.test'}),true);
 for(const user of [null,{}, {email:'owner@example.test.evil'}, {email:'other@example.test',user_metadata:{admin:true}}])assert.equal(access.isMembershipAdmin(user),false);
 assert.equal(load('lib/membership/complimentary.ts',{'./store':{}}).isMembershipAdmin({email:'owner@example.test'}),false);
 assert.equal(access.normaliseAccessEmail(' Friend@Example.test '),'friend@example.test');
 for(const email of ['bad','a@b\n.test',null,'a'.repeat(255)+'@b.test'])assert.equal(access.normaliseAccessEmail(email),null);
});
test('management API rejects anonymous, ordinary users, forged origin and invalid payload before database writes',async()=>{
 let user=null,writes=0,lists=0;
 const route=load('app/api/membership/complimentary/route.ts',{'@/lib/membership/config':{membershipPreviewEnabled:()=>true,sameOrigin:r=>r.headers.get('origin')==='https://preview.example.test'},'@/lib/membership/auth':{membershipUser:async()=>user},'@/lib/membership/complimentary':{...access,listComplimentary:async()=>{lists++;return [];},changeComplimentary:async()=>{writes++;}}});
 const req=(body,origin='https://preview.example.test')=>new Request('https://preview.example.test/api/membership/complimentary',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 for(user of [null,{id:A,email:'ordinary@example.test'}]){assert.equal((await route.GET()).status,403);assert.equal((await route.POST(req({action:'grant',email:'friend@example.test',note:''}))).status,403);}
 assert.equal(lists,0);assert.equal(writes,0);
 user={id:A,email:'owner@example.test'};
 assert.equal((await route.POST(req({action:'grant',email:'friend@example.test',note:''},'https://evil.test'))).status,403);
 assert.equal((await route.POST(req({action:'grant',email:'invalid',note:''}))).status,400);
 assert.equal(writes,0);
 const response=await route.POST(req({action:'grant',email:'friend@example.test',note:'Friend'}));assert.equal(response.status,200);assert.equal(writes,1);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('production management is unavailable even to the owner',async()=>{
 const route=load('app/api/membership/complimentary/route.ts',{'@/lib/membership/config':{membershipPreviewEnabled:()=>false},'@/lib/membership/auth':{},'@/lib/membership/complimentary':{}});
 assert.equal((await route.GET()).status,404);assert.equal((await route.POST(new Request('https://example.test'))).status,404);
});
test('complimentary email grants bypass quotas, retain concurrency limits, revoke immediately and preserve paid subscriptions',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_membership.sql','002_trial_and_passes.sql','004_complimentary.sql'])await db.exec(fs.readFileSync('billing/migrations/'+file,'utf8'));
 await db.query("insert into medicea_billing.complimentary_access(email,note,updated_by) values('friend@example.test','Friend',$1)",[A]);
 const status=async(member,email)=>(await db.query('select medicea_billing.member_status($1,$2) result',[member,email])).rows[0].result;
 const reserve=async(n,email='FRIEND@example.test')=>(await db.query('select medicea_billing.reserve_search($1,$2,$3) result',[B,`33333333-3333-4333-8333-${String(n).padStart(12,'0')}`,email])).rows[0].result;
 assert.equal((await status(B,'friend@example.test')).complimentary,true);assert.equal((await status(B,'other@example.test')).premium,false);assert.equal((await status(B,null)).premium,false);
 for(let i=1;i<=12;i++){const r=await reserve(i);assert.equal(r.source,'complimentary');await db.query('select medicea_billing.finish_search($1,$2,true)',[B,r.id]);}
 assert.equal((await status(B,'friend@example.test')).used,0);assert.equal((await status(B,'friend@example.test')).trialUsed,0);
 for(let i=20;i<23;i++)assert.equal((await reserve(i)).allowed,true);
 assert.equal((await reserve(23)).reason,'TOO_MANY_CONCURRENT_REQUESTS');
 assert.equal((await reserve(20)).reason,'REQUEST_ALREADY_USED');
 await db.exec("update medicea_billing.search set state='succeeded'; update medicea_billing.complimentary_access set active=false");
 assert.equal((await status(B,'friend@example.test')).premium,false);assert.equal((await reserve(30)).source,'trial');
 await db.query("insert into medicea_billing.entitlement(provider,external_id,member_id,active,valid_until) values('stripe','sub_test',$1,true,now()+interval '30 days')",[B]);
 assert.equal((await status(B,'friend@example.test')).paidAccess,true);assert.equal((await reserve(31)).source,'paid');
 assert.equal((await db.query('select active from medicea_billing.entitlement')).rows[0].active,true);
 }finally{await db.close();}
});

test('unconfirmed Supabase email never authorises owner or complimentary access',async()=>{
 let identity={id:A,email:'owner@example.test'};
 const auth=load('lib/membership/auth.ts',{'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:identity},error:null})}})},'next/headers':{cookies:async()=>({getAll:()=>[],set:()=>{}})}},{MEDICEA_MEMBERSHIP_AUTH_URL:'https://auth.example.test',MEDICEA_MEMBERSHIP_AUTH_PUBLISHABLE_KEY:'fixture'});
 assert.equal((await auth.membershipUser()).email,undefined);
 identity.email_confirmed_at=new Date().toISOString();assert.equal((await auth.membershipUser()).email,'owner@example.test');
});
test('complimentary-only status never labels a paid plan or queries a payment provider',async()=>{
 let lookedUp=false;
 const route=load('app/api/membership/status/route.ts',{'@/lib/membership/config':{membershipPreviewEnabled:()=>true},'@/lib/membership/auth':{membershipUser:async()=>({id:A,email:'friend@example.test'})},'@/lib/membership/complimentary':{isMembershipAdmin:()=>false},'@/lib/membership/store':{membershipStatus:async(id,email)=>{assert.equal(email,'friend@example.test');return {premium:true,paidAccess:false,complimentary:true};}},'@/lib/membership/active-plans':{membershipPlans:async()=>{lookedUp=true;throw Error();}}});
 const body=await (await route.GET()).json();assert.equal(body.complimentary,true);assert.equal(lookedUp,false);assert.equal(body.activePlans.length,0);assert.equal(body.planDetailsUnavailable,false);
});

test('server page identity reads never write cookies; route identity refresh still persists cookies',async()=>{
 let writes=0;
 const auth=load('lib/membership/auth.ts',{'@supabase/ssr':{createServerClient:(url,key,options)=>({auth:{getUser:async()=>{options.cookies.setAll([{name:'session',value:'fixture',options:{}}]);return {data:{user:{id:A,email:'owner@example.test',email_confirmed_at:'2026-01-01'}},error:null};}}})},'next/headers':{cookies:async()=>({getAll:()=>[],set:()=>{writes++;}})}},{MEDICEA_MEMBERSHIP_AUTH_URL:'https://auth.example.test',MEDICEA_MEMBERSHIP_AUTH_PUBLISHABLE_KEY:'fixture'});
 assert.equal((await auth.membershipUser(true)).id,A);assert.equal(writes,0);
 await auth.membershipUser();assert.equal(writes,1);
});
