const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function load(file,env={},imports={}){const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{module,exports:module.exports,require:name=>imports[name]||(['./search-result','./search-grant'].includes(name)?load('lib/membership/'+name.slice(2)+'.ts',{STRIPE_WEBHOOK_SECRET:'whsec_fixture',...env}):require(name)),process:{env},URL,URLSearchParams,Buffer,Date,Response,Request,AbortSignal,fetch});return module.exports;}
test('membership stays disabled in production even with flag and test credentials',()=>{for(const env of [{VERCEL_ENV:'production',NODE_ENV:'production'},{NODE_ENV:'production'},{VERCEL_ENV:'development',NODE_ENV:'production'}])assert.equal(load('lib/membership/config.ts',{...env,MEDICEA_MEMBERSHIP_PREVIEW:'true'}).membershipPreviewEnabled(),false);assert.equal(load('lib/membership/config.ts',{VERCEL_ENV:'preview',MEDICEA_MEMBERSHIP_PREVIEW:'true'}).membershipPreviewEnabled(),true);});
test('pricing, UTC month boundaries, origin and Stripe live-key rejection',()=>{const c=load('lib/membership/config.ts',{STRIPE_SECRET_KEY:'sk_live_forbidden',MEDICEA_MEMBERSHIP_ORIGIN:'https://preview.example'});assert.equal(c.PERSONAL_PLANS.monthly.amountMinor,249);assert.equal(c.PERSONAL_PLANS.annual.amountMinor,1999);assert.equal(c.periodKey(new Date('2026-11-01T00:00:00Z')),'2026-11');assert.throws(()=>c.stripeTestKey());assert.equal(c.sameOrigin(new Request('https://preview.example/api',{headers:{origin:'https://attacker.example'}})),false);});
const sig=(raw,time,secret)=>'t='+time+',v1='+crypto.createHmac('sha256',secret).update(time+'.'+raw).digest('hex');
function stripe(env={}){return load('lib/membership/stripe.ts',env,{'./config':load('lib/membership/config.ts',env)});}
test('webhooks require exact body, timely signature and endpoint secret',()=>{const s=stripe();const raw=JSON.stringify({id:'evt_1'}),secret='whsec_test',now=10000;assert.equal(s.verifyStripeSignature(raw,sig(raw,now,secret),secret,now).id,'evt_1');assert.throws(()=>s.verifyStripeSignature(raw+' ',sig(raw,now,secret),secret,now));assert.throws(()=>s.verifyStripeSignature(raw,sig(raw,now-301,secret),secret,now));assert.throws(()=>s.verifyStripeSignature(raw,sig(raw,now,secret),'whsec_wrong',now));assert.throws(()=>s.verifyStripeSignature(raw,'t=10000,t=10000,v1=bad',secret,now));});
test('subscription access excludes pending, unpaid, expired, live and wrong-product purchases',()=>{const s=stripe({STRIPE_PERSONAL_MONTHLY_PRICE_ID:'price_monthly'});const now=Date.now();const sub={livemode:false,status:'active',items:{data:[{price:{id:'price_monthly'},current_period_end:Math.floor(now/1000)+3600}]}};assert.equal(s.subscriptionAccess(sub,now).active,true);for(const status of ['incomplete','past_due','unpaid','canceled','trialing'])assert.equal(s.subscriptionAccess({...sub,status},now).active,false);assert.equal(s.subscriptionAccess(sub,now+7200000).active,false);assert.throws(()=>s.subscriptionAccess({...sub,livemode:true},now));assert.throws(()=>s.subscriptionAccess({...sub,items:{data:[]}},now));});
test('meter authorises identity before provider and fails closed on store errors',async()=>{let provider=0;const req=new Request('https://preview.example/api',{method:'POST',headers:{origin:'https://preview.example'}});const imports={'./config':{membershipPreviewEnabled:()=>true,sameOrigin:()=>true},'./auth':{membershipUser:async()=>null},'./store':{reserve:async()=>{throw Error('db down');},finish:async()=>{}}};let m=load('lib/membership/meter.ts',{},imports);assert.equal((await m.meteredSearch(req,async()=>{provider++;return Response.json({});})).status,401);imports['./auth']={membershipUser:async()=>({id:'owner'})};m=load('lib/membership/meter.ts',{},imports);assert.equal((await m.meteredSearch(req,async()=>{provider++;return Response.json({});})).status,503);assert.equal(provider,0);});
test('only successful nonempty search results consume a reservation',async()=>{for(const [body,http,expected]of [[{originProfile:{active_ingredients:[{name:'Example',strength:'5 mg'}]},equivalentResults:{raw_text:'No matches.'}},200,true],[{equivalentResults:{raw_text:'No response.'}},200,false],[{error:'failed'},500,false],[{equivalentResults:{raw_text:'No matches.'}},200,false],[{},200,false]]){let charged;const m=load('lib/membership/meter.ts',{}, {'./config':{membershipPreviewEnabled:()=>true,sameOrigin:()=>true},'./auth':{membershipUser:async()=>({id:'owner'})},'./store':{reserve:async()=>({allowed:true}),finish:async(user,id,success)=>{charged=success;}}});await m.meteredSearch(new Request('https://example.test'),async()=>Response.json(body,{status:http}));assert.equal(charged,expected);}});

test('webhooks reject forged and live events, validate customer ownership and re-fetch state on replay',async()=>{
 const secret='whsec_test',now=Math.floor(Date.now()/1000),member='11111111-1111-4111-8111-111111111111';
 let reads=0,writes=0,owner=true;
 const provider=stripe({STRIPE_PERSONAL_MONTHLY_PRICE_ID:'price_monthly'});
 const mock={'@/lib/membership/config':{membershipPreviewEnabled:()=>true},'@/lib/membership/store':{billingDb:()=>({$transaction:async callback=>callback({$queryRaw:async(strings)=>strings.join('').includes('stripe_customer')?(owner?[{member_id:member}]:[]):[],$executeRaw:async()=>{writes++;return 1;}})})},'@/lib/membership/stripe':{...provider,stripeRequest:async()=>{reads++;return {livemode:false,status:'active',metadata:{member_id:member},customer:'cus_test',items:{data:[{price:{id:'price_monthly'},current_period_end:now+3600}]}};}}};
 const route=load('app/api/membership/webhook/route.ts',{STRIPE_WEBHOOK_SECRET:secret},mock);
 const payload=JSON.stringify({livemode:false,type:'customer.subscription.updated',data:{object:{id:'sub_test'}}});
 const request=(raw=payload,signature=sig(raw,now,secret))=>new Request('https://example.test/api',{method:'POST',headers:{'stripe-signature':signature},body:raw});
 assert.equal((await route.POST(request(payload,'t=0,v1=bad'))).status,400);assert.equal(reads,0);
 const live=JSON.stringify({livemode:true});assert.equal((await route.POST(request(live))).status,400);assert.equal(reads,0);
 owner=false;assert.equal((await route.POST(request())).status,503);assert.equal(writes,0);
 owner=true;assert.equal((await route.POST(request())).status,200);assert.equal((await route.POST(request())).status,200);assert.equal(reads,3);assert.equal(writes,4);
});

test('one-off passes have launch prices, fixed expiry and no recurring price acceptance',()=>{
 const env={STRIPE_PERSONAL_7_DAY_PRICE_ID:'price_pass7'};const s=stripe(env);const now=100000000;const time=Math.floor(now/1000);
 const price={id:'price_pass7',livemode:false,active:true,currency:'gbp',unit_amount:149,recurring:null};
 const session={livemode:false,mode:'payment',status:'complete',payment_status:'paid',metadata:{plan:'pass7'},currency:'gbp',amount_total:149};
 const items={data:[{price,quantity:1}],has_more:false};
 assert.equal(s.priceMatches('pass7',price),true);assert.equal(s.priceMatches('pass7',{...price,recurring:{interval:'week',interval_count:1}}),false);
 const first=s.passAccess(session,items,time,now),replay=s.passAccess(session,items,time,now+86400000);
 assert.equal(first.until.getTime(),now+7*86400000);assert.equal(first.until.getTime(),replay.until.getTime());
 assert.equal(s.passAccess(session,items,time,now+8*86400000).active,false);
 for(const change of [{payment_status:'unpaid'},{livemode:true},{amount_total:199},{metadata:{plan:'annual'}}])assert.throws(()=>s.passAccess({...session,...change},items,time,now));
 assert.throws(()=>s.passAccess(session,{...items,data:[{price,quantity:2}]},time,now));
 const c=load('lib/membership/config.ts');assert.equal(c.POSSIBLE_LATER_PRICES.monthly,349);assert.equal(c.PERSONAL_PLANS.monthly.amountMinor,249);assert.equal(c.TRIAL.successfulSearches,5);assert.equal(c.isPersonalPlan('__proto__'),false);
});

test('checkout sends passes as one-time payments and subscriptions as recurring without card-based trials',async()=>{
 const member='11111111-1111-4111-8111-111111111111';
 for(const plan of ['pass7','pass14','pass30','monthly','annual']) {
  let sent;
  const config=load('lib/membership/config.ts');
  const route=load('app/api/membership/checkout/route.ts',{}, {
   '@/lib/membership/config':{...config,membershipPreviewEnabled:()=>true,membershipOrigin:()=> 'https://preview.example',sameOrigin:()=>true},
   '@/lib/membership/auth':{membershipUser:async()=>({id:member,email:'fictional@example.test'})},
   '@/lib/membership/store':{membershipStatus:async()=>({premium:false}),billingDb:()=>({$transaction:async cb=>cb({$queryRaw:async(strings)=>strings.join('').includes('stripe_customer')?[{customer_id:'cus_test'}]:[],$executeRaw:async()=>1})})},
   '@/lib/membership/stripe':{validatePrice:async()=> 'price_'+plan,stripeRequest:async(path,params)=>{sent=params;return {livemode:false,url:'https://checkout.stripe.com/test',id:'cs_test_fixture',expires_at:Math.floor(Date.now()/1000)+1800};}}
  });
  const response=await route.POST(new Request('https://preview.example/api',{method:'POST',body:JSON.stringify({plan})}));
  assert.equal(response.status,200);
  assert.equal(sent.get('mode'),plan.startsWith('pass')?'payment':'subscription');
  assert.equal(sent.get('metadata[plan]'),plan);assert.equal(sent.get('metadata[member_id]'),member);
  assert.equal(sent.has('subscription_data[trial_period_days]'),false);
  assert.equal(sent.has('subscription_data[metadata][member_id]'),!plan.startsWith('pass'));
 }
});
