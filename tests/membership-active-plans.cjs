const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const env={STRIPE_PERSONAL_MONTHLY_PRICE_ID:'price_monthly',STRIPE_PERSONAL_ANNUAL_PRICE_ID:'price_annual',STRIPE_PERSONAL_7_DAY_PRICE_ID:'price_pass7',STRIPE_PERSONAL_14_DAY_PRICE_ID:'price_pass14',STRIPE_PERSONAL_30_DAY_PRICE_ID:'price_pass30'};
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>imports[n]||require(n),process:{env},Date,Set,Response,Request,Buffer,URLSearchParams,AbortSignal,fetch});return module.exports;}
const config=load('lib/membership/config.ts'),stripe=load('lib/membership/stripe.ts',{'./config':config});
const plans=load('lib/membership/active-plans.ts',{'./config':config,'./stripe':stripe,'./store':{}});
const member='11111111-1111-4111-8111-111111111111',now=Math.floor(Date.now()/1000);
const sub=interval=>({id:'sub_example',customer:'cus_example',livemode:false,metadata:{member_id:member},status:'active',items:{data:[{price:{id:'price_'+interval},current_period_end:now+3600}]}});
const row={provider:'stripe',external_id:'sub_example',customer_id:'cus_example',play_plan:null};
test('monthly and annual labels follow verified provider price, never duration or client flags',async()=>{
 for(const interval of ['monthly','annual']){const result=await plans.resolveActivePlans(member,[row],async()=>sub(interval));assert.deepEqual(Array.from(result.activePlans),[interval]);assert.deepEqual(Array.from(result.activePlayPlans),[]);assert.equal(result.planDetailsUnavailable,false);}
});
test('each one-off pass maps to its validated server price',async()=>{
 for(const [plan,days,amount] of [['pass7',7,149],['pass14',14,199],['pass30',30,299]]){
  const purchase={id:'cs_test_example',customer:'cus_example',livemode:false,metadata:{member_id:member,plan},client_reference_id:member,created:now,mode:'payment',status:'complete',payment_status:'paid',currency:'gbp',amount_total:amount};
  const items={data:[{quantity:1,price:{id:'price_'+plan,livemode:false,active:true,currency:'gbp',unit_amount:amount,recurring:null}}],has_more:false};
  const result=await plans.resolveActivePlans(member,[{...row,external_id:purchase.id}],async path=>path.endsWith('/line_items')?items:purchase);assert.deepEqual(Array.from(result.activePlans),[plan]);assert.equal(result.planDetailsUnavailable,false);
 }
});
test('unknown plan and provider outage never guess a green card or fail account access',async()=>{
 for(const request of [async()=>{throw Error('offline');},async()=>({...sub('monthly'),items:{data:[{price:{id:'price_unknown'},current_period_end:now+3600}]}})]){const result=await plans.resolveActivePlans(member,[row],request);assert.equal(result.activePlans.length,0);assert.equal(result.planDetailsUnavailable,true);}
});
test('live, other-account, other-customer, inactive and expired provider objects cannot identify an active card',async()=>{
 for(const purchase of [{...sub('monthly'),livemode:true},{...sub('monthly'),metadata:{member_id:'another-account'}},{...sub('monthly'),customer:'cus_other'},{...sub('monthly'),status:'canceled'},{...sub('monthly'),items:{data:[{price:{id:'price_monthly'},current_period_end:now-10}]}}]){const result=await plans.resolveActivePlans(member,[row],async()=>purchase);assert.equal(result.activePlans.length,0);assert.equal(result.planDetailsUnavailable,true);}
});
test('known Google plans are distinguished from Stripe access without querying Stripe',async()=>{
 const result=await plans.resolveActivePlans(member,[{...row,provider:'google_play',play_plan:'pass14'}],async()=>{throw Error('must not query Stripe');});assert.deepEqual(Array.from(result.activePlans),['pass14']);assert.deepEqual(Array.from(result.activePlayPlans),['pass14']);
 const unknown=await plans.resolveActivePlans(member,[{...row,provider:'google_play',play_plan:'forged'}]);assert.equal(unknown.activePlans.length,0);assert.equal(unknown.planDetailsUnavailable,true);
});
test('no specific card is claimed for older unidentified paid access',async()=>{const result=await plans.resolveActivePlans(member,[]);assert.equal(result.activePlans.length,0);assert.equal(result.planDetailsUnavailable,true);});
test('status route never lets plan metadata create paid access or exposes purchase references',async()=>{
 let lookups=0;
 const route=load('app/api/membership/status/route.ts',{'@/lib/membership/complimentary':{isMembershipAdmin:()=>false},'@/lib/membership/config':{membershipPreviewEnabled:()=>true},'@/lib/membership/auth':{membershipUser:async()=>({id:member,email:'example@example.test'})},'@/lib/membership/store':{membershipStatus:async()=>({premium:false})},'@/lib/membership/active-plans':{membershipPlans:async()=>{lookups++;return {activePlans:['annual']};}}});
 const response=await route.GET(),body=await response.json();assert.equal(body.premium,false);assert.deepEqual(body.activePlans,[]);assert.equal(lookups,0);assert.equal(body.external_id,undefined);assert.equal(response.headers.get('cache-control'),'no-store');
});

