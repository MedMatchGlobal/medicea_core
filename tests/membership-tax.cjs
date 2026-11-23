const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,env,imports={},fetcher=fetch){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name]||require(name),process:{env},URL,URLSearchParams,Buffer,Date,Response,Request,AbortSignal,fetch:fetcher});
 return module.exports;
}
function fixture(){
 const env={VERCEL_ENV:'preview',MEDICEA_MEMBERSHIP_PREVIEW:'true',MEDICEA_STRIPE_TAX_PREVIEW:'true',STRIPE_PERSONAL_TAX_CODE:'txcd_10701401',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_PERSONAL_30_DAY_PRICE_ID:'price_pass30'};
 const state={price:{id:'price_pass30',active:true,livemode:false,currency:'gbp',unit_amount:299,recurring:null,tax_behavior:'inclusive',product:{active:true,livemode:false,tax_code:'txcd_10701401'}},settings:{livemode:false,status:'active'},registrations:{data:[{livemode:false,country:'GB',status:'active'}],has_more:false}};
 const calls=[],config=load('lib/membership/config.ts',env);
 const stripe=load('lib/membership/stripe.ts',env,{'./config':config},async(url,options)=>{
  calls.push({url,options});const path=new URL(url).pathname;
  const result=path==='/v1/prices/price_pass30'?state.price:path==='/v1/tax/settings'?state.settings:path==='/v1/tax/registrations'?state.registrations:null;
  assert.ok(result,'unexpected provider request '+path);return Response.json(result);
 });
 return {env,state,calls,config,stripe};
}
test('tax activation is confined to the paid preview even when its flag is set in production',()=>{
 const f=fixture();assert.equal(f.config.stripeTaxPreviewEnabled(),true);
 f.env.VERCEL_ENV='production';assert.equal(f.config.stripeTaxPreviewEnabled(),false);
 f.env.VERCEL_ENV='preview';f.env.MEDICEA_MEMBERSHIP_PREVIEW='false';assert.equal(f.config.stripeTaxPreviewEnabled(),false);
});
test('new taxed purchases require inclusive price, confirmed category, active settings and UK registration',async()=>{
 const f=fixture();assert.equal(await f.stripe.validatePrice('pass30','GBP'),'price_pass30');
 assert.match(f.calls[0].url,/expand%5B0%5D=product/);assert.equal(f.state.price.unit_amount,299);
 for(const mutate of [s=>s.price.tax_behavior='exclusive',s=>s.price.product.tax_code='txcd_10105001',s=>s.price.unit_amount=359,s=>s.settings.status='pending',s=>s.registrations.data=[],s=>s.registrations.data[0].country='US',s=>s.registrations.data[0].livemode=true]){
  const bad=fixture();mutate(bad.state);await assert.rejects(()=>bad.stripe.validatePrice('pass30','GBP'));
 }
});
test('historical authorised setups keep gross-price validation without acquiring a new tax policy',async()=>{
 const f=fixture();f.state.price.tax_behavior='unspecified';f.state.price.product='prod_old';
 assert.equal(await f.stripe.validatePrice('pass30','GBP',false),'price_pass30');assert.equal(f.calls.length,1);
});
test('initial taxable checkout enables tax and collects the current billing address without raising the price',async()=>{
 const f=fixture();let sent,version;
 const route=load('app/api/membership/checkout/route.ts',f.env,{
  '@/lib/membership/config':{...f.config,membershipOrigin:()=> 'https://preview.example',sameOrigin:()=>true},
  '@/lib/membership/home-country':{homeCountryCurrency:()=> 'GBP'},
  '@/lib/membership/auth':{membershipUser:async()=>({id:'11111111-1111-4111-8111-111111111111'})},
  '@/lib/membership/future-access':{memberReservation:async()=>null},
  '@/lib/membership/store':{membershipStatus:async()=>({premium:false}),billingDb:()=>({$transaction:async cb=>cb({$queryRaw:async(strings)=>strings.join('').includes('stripe_customer')?[{customer_id:'cus_test'}]:[],$executeRaw:async()=>1})})},
  '@/lib/membership/stripe':{validatePrice:f.stripe.validatePrice,stripeRequest:async(path,params,key,timeout,apiVersion)=>{
   if(path==='/subscriptions')return {data:[],has_more:false};sent=params;version=apiVersion;
   return {livemode:false,url:'https://checkout.stripe.com/test',id:'cs_test_fixture',expires_at:Math.floor(Date.now()/1000)+1800};
  }}
 });
 const response=await route.POST(new Request('https://preview.example/api',{method:'POST',body:JSON.stringify({plan:'pass30',currency:'GBP'})}));
 assert.equal(response.status,200);assert.equal(sent.get('automatic_tax[enabled]'),'true');assert.equal(sent.get('billing_address_collection'),'required');assert.equal(sent.get('customer_update[address]'),'auto');
 assert.equal(sent.get('line_items[0][price]'),'price_pass30');assert.equal(sent.get('allowed_payment_method_types[0]'),'card');assert.equal(sent.has('payment_method_types[0]'),false);assert.equal(version,'2026-11-18.endive');
 assert.equal(sent.has('line_items[0][price_data][unit_amount]'),false);
});
