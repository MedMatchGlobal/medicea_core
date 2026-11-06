const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const env={GOOGLE_PLAY_ACCOUNT_SECRET:'fixture-only-secret-with-at-least-32-characters'};
function load(file,imports={},extra={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{module,exports:module.exports,require:n=>imports[n]||(n==='./play-catalogue'?load('lib/membership/play-catalogue.ts'):require(n)),process:{env:{...env,...extra.env}},Buffer,Date,URL,URLSearchParams,Response,Request,AbortSignal,fetch,...extra});return module.exports;}
const policy=load('lib/membership/play-policy.ts'),A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',token='fixture-purchase-token-1';
const pass=(changes={})=>({purchaseType:0,purchaseState:0,consumptionState:0,acknowledgementState:0,quantity:1,purchaseTimeMillis:String(Date.now()),obfuscatedExternalAccountId:policy.playAccount(A),...changes});
const sub=(changes={})=>({latestOrderId:'GPA.fixture..0',testPurchase:{},externalAccountIdentifiers:{obfuscatedExternalAccountId:policy.playAccount(A)},subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',lineItems:[{productId:'medicea_personal',offerDetails:{basePlanId:'monthly'},autoRenewingPlan:{autoRenewEnabled:true},expiryTime:new Date(Date.now()+3600000).toISOString()}],...changes});

test('Android defaults to the public site; private device testing requires explicit opt-in',()=>{
 const normal=load('capacitor.config.ts').default;
 assert.equal(normal.server.url,'https://medicea.global');
 assert.equal(normal.server.cleartext,false);
 const preview=load('capacitor.config.ts',{}, {env:{MEDICEA_ANDROID_TEST_PREVIEW:'true'}}).default;
 assert.equal(preview.appId,'global.medicea.app');
 assert.equal(preview.server.url,'https://medicea-core-git-feature-google-17fe5b-medmatchglobals-projects.vercel.app');
 assert.equal(new URL(preview.server.url).search,'');
 assert.equal(load('capacitor.config.ts',{}, {env:{MEDICEA_ANDROID_TEST_PREVIEW:'false'}}).default.server.url,normal.server.url);
});
test('pass expiry uses Google time; rejects wrong identity, real purchases, quantity and invalid time',()=>{
 const p=pass(),first=policy.playAccess('pass7',p,policy.playAccount(A)),again=policy.playAccess('pass7',p,policy.playAccount(A),Date.now()+86400000);
 assert.equal(first.until.getTime(),again.until.getTime());assert.equal(first.fulfill,'consume');
 assert.equal(policy.playAccess('pass7',pass({purchaseState:2}),policy.playAccount(A)).active,false);
 assert.equal(policy.playAccess('pass7',pass({purchaseState:1}),policy.playAccount(A)).active,false);
 for(const change of [{purchaseType:undefined},{quantity:2},{purchaseTimeMillis:'invalid'},{obfuscatedExternalAccountId:policy.playAccount(B)}])assert.throws(()=>policy.playAccess('pass7',pass(change),policy.playAccount(A)));
 assert.equal(policy.playAccess('pass7',p,policy.playAccount(A),Date.now()+8*86400000).active,false);
 assert.equal(policy.playAccess('pass7',pass({consumptionState:1}),policy.playAccount(A)).fulfill,null);
});
test('subscriptions handle renewal, grace, cancellation, hold, pause, expiry and wrong base plans',()=>{
 for(const state of ['ACTIVE','IN_GRACE_PERIOD','CANCELED'])assert.equal(policy.playAccess('monthly',sub({subscriptionState:'SUBSCRIPTION_STATE_'+state}),policy.playAccount(A)).active,true);
 for(const state of ['PENDING','ON_HOLD','PAUSED','EXPIRED','PENDING_PURCHASE_CANCELED'])assert.equal(policy.playAccess('monthly',sub({subscriptionState:'SUBSCRIPTION_STATE_'+state}),policy.playAccount(A)).active,false);
 assert.throws(()=>policy.playAccess('annual',sub(),policy.playAccount(A)));assert.throws(()=>policy.playAccess('monthly',sub({testPurchase:undefined}),policy.playAccount(A)));
 assert.equal(policy.playAccess('monthly',sub(),policy.playAccount(A),Date.now()+7200000).active,false);
 assert.notEqual(policy.playAccount(A),policy.playAccount(B));
});
async function setup(){const db=new PGlite();for(const name of ['001_membership','002_trial_and_passes','003_google_play'])await db.exec(fs.readFileSync('billing/migrations/'+name+'.sql','utf8'));
 const raw=async(strings,...values)=>db.query(strings.reduce((s,x,i)=>s+(i?'$'+i:'')+x,''),values);
 const adapter={$queryRaw:async(...a)=>(await raw(...a)).rows,$executeRaw:async(...a)=>(await raw(...a)).affectedRows};adapter.$transaction=async fn=>{await db.exec('BEGIN');try{const r=await fn(adapter);await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}};
 let value=pass(),voidedPage={},fail=false,consumes=0;
 const service=load('lib/membership/play.ts',{'./config':{membershipPreviewEnabled:()=>true},'./store':{billingDb:()=>adapter},'./play-policy':policy,'./play-api':{purchasePath:()=>'/get',fulfillmentPath:()=>'/fulfill',playRequest:async(path)=>{if(path==='/get')return value;if(path.startsWith('/purchases/voidedpurchases?'))return voidedPage;consumes++;if(fail)throw Error('provider temporarily unavailable');return {};}}},{env:{MEDICEA_GOOGLE_PLAY_TEST:'true'}});
 return {db,service,set:v=>value=v,voided:v=>voidedPage=v,fail:v=>fail=v,consumes:()=>consumes,status:async()=>(await db.query('select medicea_billing.member_status($1) result',[A])).rows[0].result};
}
test('durable grant precedes consumption; restore retries; token ownership and expiry enforced by SQL ledger',async()=>{
 const f=await setup();try{
 f.fail(true);await assert.rejects(()=>f.service.syncPlay(A,'pass7',token));assert.equal((await f.status()).premium,true);
 f.fail(false);await f.service.syncPlay(A,'pass7',token);assert.equal(f.consumes(),2);
 await assert.rejects(()=>f.service.syncPlay(B,'pass7',token));await assert.rejects(()=>f.service.syncPlay(A,'pass14',token));
 const row=(await f.db.query('select * from medicea_billing.play_purchase')).rows[0];assert.equal(row.member_id,A);assert.equal(row.fulfilled,true);
 await f.db.exec("update medicea_billing.entitlement set valid_until=now()-interval '1 second'");assert.equal((await f.status()).premium,false);
 f.set(pass({purchaseState:1}));await f.service.syncPlay(A,'pass7',token);assert.equal((await f.status()).premium,false);
 }finally{await f.db.close();}
});
test('linked tokens are tombstoned; replay cannot restore old entitlement; voided token stays revoked',async()=>{
 const f=await setup();try{
 f.set(sub());await f.service.syncPlay(A,'monthly',token);
 const replacement=token+'-new';f.set(sub({linkedPurchaseToken:token}));await f.service.syncPlay(A,'monthly',replacement);
 f.set(sub());await f.service.syncPlay(A,'monthly',token);
 assert.equal((await f.db.query('select active from medicea_billing.entitlement where external_id=$1',[token])).rows[0].active,false);
 await f.service.syncKnownPlay(replacement,true,'GPA.fixture..0');await f.service.syncPlay(A,'monthly',replacement);assert.equal((await f.status()).premium,false);
 f.set(sub({latestOrderId:'GPA.fixture..1'}));await f.service.syncPlay(A,'monthly',replacement);assert.equal((await f.status()).premium,true);
 await f.service.syncKnownPlay(replacement,true,'GPA.fixture..0');assert.equal((await f.status()).premium,true);
 }finally{await f.db.close();}
});
test('verification failures never grant or consume; production remains disabled',async()=>{
 const f=await setup();try{f.set(pass({obfuscatedExternalAccountId:'forged'}));await assert.rejects(()=>f.service.syncPlay(A,'pass7',token));assert.equal(f.consumes(),0);assert.equal((await f.status()).premium,false);}finally{await f.db.close();}
 const production=load('lib/membership/play.ts',{'./config':{membershipPreviewEnabled:()=>false},'./store':{},'./play-policy':policy,'./play-api':{}},{env:{MEDICEA_GOOGLE_PLAY_TEST:'true'}});assert.equal(production.playEnabled(),false);
});
test('voided purchase backfill persists pagination and prevents refunded pass replay',async()=>{
 const f=await setup();try{
 await f.service.syncPlay(A,'pass7',token);f.voided({voidedPurchases:[{purchaseToken:token,orderId:'GPA.pass'}],tokenPagination:{nextPageToken:'next-fixture'}});
 assert.equal(await f.service.backfillVoidedPlay(),true);assert.equal((await f.status()).premium,false);
 assert.equal((await f.db.query('select page_token from medicea_billing.play_reconcile_cursor')).rows[0].page_token,'next-fixture');
 await f.service.syncPlay(A,'pass7',token);assert.equal((await f.status()).premium,false);
 f.voided({});assert.equal(await f.service.backfillVoidedPlay(),false);
 assert.equal((await f.db.query('select page_token from medicea_billing.play_reconcile_cursor')).rows[0].page_token,'');
 }finally{await f.db.close();}
});
test('RTDN requires Google identity and exact audience, verified email and signature',async()=>{
 const api=load('lib/membership/play-api.ts',{'./play-policy':policy});await assert.rejects(()=>api.verifyRtdn(new Request('https://example.test')));
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const jwt=encode({alg:'none'})+'.'+encode({iss:'accounts.google.com'})+'.fake';
 await assert.rejects(()=>api.verifyRtdn(new Request('https://example.test',{headers:{authorization:'Bearer '+jwt}})));
});
test('Google OIDC accepts valid signature and rejects tampering, expiry and wrong audience/email',async()=>{
 const crypto=require('node:crypto'),keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const now=Math.floor(Date.now()/1000),email='push@example.iam.gserviceaccount.com',aud='https://example.test/api/membership/play/rtdn';
 const api=load('lib/membership/play-api.ts',{'./play-policy':policy},{env:{GOOGLE_PLAY_RTDN_EMAIL:email,GOOGLE_PLAY_RTDN_AUDIENCE:aud},fetch:async()=>Response.json({keys:[{...keys.publicKey.export({format:'jwk'}),kid:'fixture',alg:'RS256'}]})});
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const signed=change=>{const data=encode({alg:'RS256',kid:'fixture'})+'.'+encode({iss:'https://accounts.google.com',email,email_verified:true,aud,iat:now,exp:now+300,...change});return data+'.'+crypto.sign('RSA-SHA256',Buffer.from(data),keys.privateKey).toString('base64url');};
 const req=jwt=>new Request(aud,{headers:{authorization:'Bearer '+jwt}});
 await api.verifyRtdn(req(signed({})));
 for(const change of [{email:'wrong@example.test'},{aud:'https://attacker.example'},{exp:now-1},{email_verified:false},{iat:now+3600}])await assert.rejects(()=>api.verifyRtdn(req(signed(change))));
 const valid=signed({}),parts=valid.split('.');parts[2]=Buffer.alloc(256).toString('base64url');await assert.rejects(()=>api.verifyRtdn(req(parts.join('.'))));
});
test('purchase route requires server auth and origin; client premium and member flags do not authorize',async()=>{
 let writes=0,user=null;
 const route=load('app/api/membership/play/route.ts',{'@/lib/membership/auth':{membershipUser:async()=>user},'@/lib/membership/config':{sameOrigin:r=>r.headers.get('origin')==='https://preview.test'},'@/lib/membership/play':{playEnabled:()=>true,syncPlay:async(member,plan,t)=>{assert.equal(member,A);writes++;return {active:false};}},'@/lib/membership/play-policy':policy,'@/lib/membership/store':{}});
 const request=(body,origin='https://preview.test')=>new Request('https://preview.test/api/membership/play',{method:'POST',headers:{origin},body:JSON.stringify(body)});
 assert.equal((await route.POST(request({plan:'pass7',token,member:B,premium:true}))).status,401);assert.equal(writes,0);
 user={id:A};assert.equal((await route.POST(request({plan:'pass7',token},'https://attacker.test'))).status,403);
 assert.equal((await route.POST(request({plan:'__proto__',token}))).status,400);
 assert.equal((await route.POST(request({plan:'pass7',token,member:B,premium:true}))).status,200);assert.equal(writes,1);
});
