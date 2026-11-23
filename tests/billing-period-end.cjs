const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const member='11111111-1111-4111-8111-111111111111',now=Math.floor(Date.now()/1000),start=now+7*86400;
const env={};
for(const [plan,stem] of Object.entries({pass7:'7_DAY',pass14:'14_DAY',pass30:'30_DAY',monthly:'MONTHLY',annual:'ANNUAL'}))for(const currency of ['GBP','EUR','USD'])env['STRIPE_PERSONAL_'+stem+'_PRICE_ID'+(currency==='GBP'?'':'_'+currency)]='price_'+plan+currency;
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:n=>imports[n]||require(n),process:{env},Response,Request,URL,URLSearchParams,Date,Set,Map,Intl});return module.exports;}
const config=load('lib/membership/config.ts'),stripe=load('lib/membership/stripe.ts',{'./config':config});
function price(plan,currency='GBP'){return {id:'price_'+plan+currency,product:'prod_personal',active:true,livemode:false,currency:currency.toLowerCase(),unit_amount:config.planAmount(plan,currency),recurring:plan.startsWith('pass')?null:{interval:plan==='annual'?'year':'month',interval_count:1}};}
function metadata(params){return Object.fromEntries([...params].filter(([key])=>/^metadata\[/.test(key)).map(([key,value])=>[key.slice(9,-1),value]));}
function fixture(){
 const calls=[],objects={},customer={id:'cus_test',livemode:false,metadata:{member_id:member}};
 const tx={$queryRaw:async(strings)=>{
  const query=strings.join('');if(query.includes('FROM medicea_billing.entitlement'))return [{provider:'stripe',external_id:'cs_test_pass',customer_id:'cus_test',valid_until:new Date(start*1000)}];
  if(query.includes('FROM medicea_billing.stripe_customer'))return [{customer_id:'cus_test',member_id:member}];return [];
 },$executeRaw:async()=>1};
 const pass={id:'cs_test_pass',livemode:false,customer:'cus_test',mode:'payment',status:'complete',payment_status:'paid',created:now,client_reference_id:member,currency:'gbp',amount_total:149,metadata:{member_id:member,plan:'pass7',currency:'GBP'}};
 const request=async(path,params,idempotency)=>{
  calls.push({path,params:params&&Object.fromEntries(params),idempotency});
  if(path.startsWith('/prices/')){const found=Object.keys(config.PERSONAL_PLANS).flatMap(plan=>['GBP','EUR','USD'].map(currency=>price(plan,currency))).find(price=>path==='/prices/'+price.id);if(!found)throw Error('Unknown price');return found;}
  if(path==='/customers/cus_test'){if(params)Object.assign(customer.metadata,metadata(params));return structuredClone(customer);}
  if(path==='/checkout/sessions/cs_test_pass')return pass;
  if(path==='/checkout/sessions/cs_test_pass/line_items')return {data:[{quantity:1,price:price('pass7')}],has_more:false};
  if(path==='/checkout/sessions')return objects.session={id:'cs_test_reserve',livemode:false,mode:'setup',status:'open',customer:'cus_test',client_reference_id:member,metadata:metadata(params),setup_intent:'seti_test',url:'https://checkout.stripe.com/test',expires_at:now+1800};
  if(path==='/checkout/sessions/cs_test_reserve'){if(params)Object.assign(objects.session.metadata,metadata(params));return structuredClone(objects.session);}
  if(path==='/setup_intents/seti_test')return {livemode:false,status:'succeeded',customer:'cus_test',payment_method:'pm_test'};
  if(path==='/invoices')return objects.invoice={id:'in_test',livemode:false,customer:'cus_test',status:'draft',metadata:metadata(params),currency:params.get('currency'),auto_advance:false,total:0,lines:{data:[],has_more:false}};
  if(path==='/invoiceitems'){const p=Object.keys(config.PERSONAL_PLANS).flatMap(plan=>['GBP','EUR','USD'].map(currency=>price(plan,currency))).find(price=>price.id===params.get('pricing[price]'));objects.invoice.lines.data.push({quantity:1,pricing:{price_details:{price:p.id}}});objects.invoice.total+=p.unit_amount;return {id:'ii_test'};}
  if(path==='/invoices/in_test'){if(params){if(params.has('auto_advance'))objects.invoice.auto_advance=params.get('auto_advance')==='true';if(params.has('automatically_finalizes_at'))objects.invoice.automatically_finalizes_at=Number(params.get('automatically_finalizes_at'));Object.assign(objects.invoice.metadata,metadata(params));}return structuredClone(objects.invoice);}
  if(path==='/subscription_schedules'&&!params)return {data:objects.schedule?[objects.schedule]:[],has_more:false};
  if(path==='/subscription_schedules')return objects.schedule={id:'sub_sched_test',livemode:false,customer:'cus_test',status:'not_started',metadata:metadata(params),phases:[{start_date:Number(params.get('start_date')),items:[{price:params.get('phases[0][items][0][price]'),quantity:1}]}]};
  if(path==='/subscription_schedules/sub_sched_test')return structuredClone(objects.schedule);
  if(path==='/subscription_schedules/sub_sched_test/cancel'){objects.schedule.status='canceled';return objects.schedule;}
  throw Error('Unexpected provider call '+path);
 };
 const future=load('lib/membership/future-access.ts',{'./config':{...config,membershipOrigin:()=> 'https://preview.example'},'./store':{billingDb:()=>({...tx,$transaction:async fn=>fn(tx)})},'./stripe':{...stripe,stripeRequest:request,validatePrice:async(plan,currency)=>config.isPersonalPlan(plan)?'price_'+plan+currency:Promise.reject(Error())}});
 return {future,request,calls,objects,customer,tx};
}
test('quote and reservation collect authorisation without charging or starting access early',async()=>{
 const f=fixture();const quote=await f.future.reserveCheckout(member,'pass14','GBP',undefined,f.request);
 assert.equal(quote.startsAt,new Date(start*1000).toISOString());assert.equal(quote.amountMinor,199);assert.equal(f.calls.some(call=>call.params),false);
 await f.future.reserveCheckout(member,'pass14','GBP',quote.startsAt,f.request);
 const setup=f.calls.find(call=>call.path==='/checkout/sessions');assert.equal(setup.params.mode,'setup');assert.match(setup.params['custom_text[submit][message]'],/No charge now/);assert.equal(setup.params['line_items[0][price]'],undefined);
 assert.equal(f.objects.invoice,undefined);assert.equal(f.objects.schedule,undefined);
 f.objects.session.status='complete';await f.future.completeReservation('cs_test_reserve',f.request);
 assert.equal(f.objects.invoice.total,199);assert.equal(f.objects.invoice.auto_advance,true);assert.equal(f.objects.invoice.automatically_finalizes_at,start);
 assert.equal((await f.future.readReservation(f.customer,member,f.request)).state,'reserved');
 await f.future.completeReservation('cs_test_reserve',f.request);
 assert.equal(f.calls.filter(call=>call.path==='/invoices').length,1);assert.equal(f.calls.filter(call=>call.path==='/invoiceitems').length,1);
 await assert.rejects(()=>f.future.reserveCheckout(member,'pass30','GBP',quote.startsAt,f.request),/RESERVATION_EXISTS/);
 await f.future.cancelReservation(member,f.request);assert.equal(f.objects.invoice.auto_advance,false);assert.equal(await f.future.readReservation(f.customer,member,f.request),null);
});
test('pass-to-subscription starts after expiry, has a saved card and no immediate subscription or invoice',async()=>{
 const f=fixture();await f.future.reserveCheckout(member,'annual','EUR',new Date(start*1000).toISOString(),f.request);f.objects.session.status='complete';
 await f.future.completeReservation('cs_test_reserve',f.request);
 const creation=f.calls.find(call=>call.path==='/subscription_schedules'&&call.params);assert.equal(creation.params.start_date,String(start));assert.equal(creation.params['default_settings[default_payment_method]'],'pm_test');assert.equal(creation.params['phases[0][items][0][price]'],'price_annualEUR');assert.equal(creation.params['phases[0][metadata][member_id]'],member);
 assert.equal(f.objects.invoice,undefined);assert.equal(f.calls.some(call=>call.path==='/subscriptions'),false);
 await f.future.cancelReservation(member,f.request);assert.equal(f.objects.schedule.status,'canceled');
});
test('reservation failures do not grant access and changed dates or owners cannot authorise charges',async()=>{
 const f=fixture();await assert.rejects(()=>f.future.reserveCheckout(member,'pass7','GBP',new Date((start-1)*1000).toISOString(),f.request),/RESERVATION_CHANGED/);
 assert.equal(f.objects.session,undefined);
 await f.future.reserveCheckout(member,'pass7','GBP',new Date(start*1000).toISOString(),f.request);f.objects.session.status='complete';f.objects.session.client_reference_id='another-member';
 await assert.rejects(()=>f.future.completeReservation('cs_test_reserve',f.request),/Invalid reservation setup/);assert.equal(f.objects.invoice,undefined);
});
test('reserved passes grant their full duration only after validated payment; replay never extends expiry',()=>{
 const f=fixture();const invoice={livemode:false,status:'paid',currency:'gbp',total:149,metadata:{plan:'pass7',currency:'GBP',reservation_start:String(start),reservation_policy:'medicea-next-access-v1',reservation_price:'price_pass7GBP'},status_transitions:{paid_at:start+60},lines:{data:[{quantity:1,pricing:{price_details:{price:'price_pass7GBP'}}}],has_more:false}};
 const first=f.future.reservedPassAccess(invoice,(start+60)*1000),replay=f.future.reservedPassAccess(invoice,(start+3600)*1000);assert.equal(first.until.getTime(),(start+60+7*86400)*1000);assert.equal(first.until.getTime(),replay.until.getTime());
 for(const change of [{status:'open'},{livemode:true},{total:1},{status_transitions:{paid_at:start-1}},{lines:{data:[],has_more:false}}])assert.throws(()=>f.future.reservedPassAccess({...invoice,...change},(start+60)*1000));
});
test('portal explicitly schedules both switch directions, with no prorations or immediate charges',async()=>{
 const policy=load('lib/membership/portal-policy.ts',{'./config':config,'./stripe':stripe});let sent;
 const request=async(path,params,_key,_timeout,_version,query)=>{
  if(path.startsWith('/prices/'))return path.includes('monthly')?price('monthly'):price('annual');
  if(!params){assert.equal(query.get('expand[0]'),'data.features.subscription_update.products');return {data:[{active:true,livemode:false,metadata:{medicea_policy:'old'},features:{subscription_update:{enabled:true}}}]};}
  sent=Object.fromEntries(params);
  assert.equal(params.get('expand[0]'),'features.subscription_update.products','Stripe omits products unless explicitly expanded');
  return {id:'bpc_test',active:true,livemode:false,features:{subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:true,proration_behavior:'none',default_allowed_updates:['price'],products:[{product:'prod_personal',prices:['price_monthlyGBP','price_annualGBP']}],schedule_at_period_end:{conditions:[{type:'decreasing_item_amount'},{type:'shortening_interval'}]}}}};
 };
 assert.equal(await policy.periodEndPortalConfiguration('GBP',request),'bpc_test');
 assert.equal(sent['features[subscription_update][proration_behavior]'],'none');assert.equal(sent['features[subscription_update][schedule_at_period_end][conditions][0][type]'],'decreasing_item_amount');assert.equal(sent['features[subscription_update][schedule_at_period_end][conditions][1][type]'],'shortening_interval');
 assert.equal(sent['features[subscription_cancel][mode]'],'at_period_end');
 assert.equal(policy.safePortalPolicy({active:true,livemode:false,features:{subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:true,proration_behavior:'none'}}},['price_monthlyGBP']),false);
});
test('account summary returns current terms and scheduled start rather than guessing from the home-country price',async()=>{
 const f=fixture();const plans=load('lib/membership/active-plans.ts',{'./config':config,'./stripe':stripe,'./store':{},'./future-access':f.future});
 const end=now+30*86400;
 const subscription={id:'sub_current',livemode:false,customer:'cus_test',metadata:{member_id:member},status:'active',currency:'gbp',schedule:'sub_sched_change',items:{data:[{price:price('monthly'),current_period_end:end}]}};
 const schedule={id:'sub_sched_change',livemode:false,customer:'cus_test',subscription:'sub_current',phases:[{start_date:end,items:[{price:'price_annualGBP',quantity:1}]}]};
 const result=await plans.resolveActivePlans(member,[{provider:'stripe',external_id:'sub_current',customer_id:'cus_test',play_plan:null}],async path=>path.startsWith('/prices/')?price('annual'):path.startsWith('/subscription_schedules/')?schedule:subscription);
 const summary=result.planSummaries[0];assert.equal(summary.plan,'monthly');assert.equal(summary.amountMinor,299);assert.equal(summary.periodEndsAt,new Date(end*1000).toISOString());assert.equal(summary.scheduledChange.plan,'annual');assert.equal(summary.scheduledChange.startsAt,summary.periodEndsAt);assert.equal(summary.scheduledChange.amountMinor,1999);assert.equal(summary.customer_id,undefined);
});
test('a retry recovers the same schedule even if the account pointer update was interrupted',async()=>{
 const f=fixture();await f.future.reserveCheckout(member,'monthly','GBP',new Date(start*1000).toISOString(),f.request);f.objects.session.status='complete';await f.future.completeReservation('cs_test_reserve',f.request);
 delete f.objects.session.metadata.reservation_processed;
 const pointer=JSON.parse(f.customer.metadata.medicea_next_access);delete pointer.id;f.customer.metadata.medicea_next_access=JSON.stringify(pointer);
 await f.future.completeReservation('cs_test_reserve',f.request);
 assert.equal(f.calls.filter(call=>call.path==='/subscription_schedules'&&call.params).length,1);
 assert.equal(JSON.parse(f.customer.metadata.medicea_next_access).id,'sub_sched_test');
});
test('an unexpected provider charge date is disarmed rather than accepted',async()=>{
 const f=fixture();await f.future.reserveCheckout(member,'pass7','GBP',new Date(start*1000).toISOString(),f.request);f.objects.session.status='complete';
 const request=async(...args)=>{const result=await f.request(...args);return args[1]?.get('auto_advance')==='true'?{...result,automatically_finalizes_at:start-1}:result;};
 await assert.rejects(()=>f.future.completeReservation('cs_test_reserve',request),/Unexpected invoice charge date/);
 assert.equal(f.objects.invoice.auto_advance,false);
});
test('recurring and Google purchases cannot create a second overlapping subscription through reservations',async()=>{
 const f=fixture();for(const row of [{provider:'stripe',external_id:'sub_existing'},{provider:'google_play',external_id:'play_existing'}]){
  await assert.rejects(()=>f.future.reservationWindow({$queryRaw:async()=>[row]},member,f.request),/ACTIVE_PASS_REQUIRED/);
 }assert.equal(f.objects.session,undefined);
});
test('reservation API rejects disabled billing, foreign origins, anonymous requests and missing confirmation before provider writes',async()=>{
 for(const [options,expected] of [[{enabled:false},404],[{origin:false},403],[{signedIn:false},401],[{},400]]){
  let calls=0;const route=load('app/api/membership/reservation/route.ts',{
   '@/lib/membership/config':{membershipPreviewEnabled:()=>options.enabled!==false,sameOrigin:()=>options.origin!==false,isPersonalPlan:config.isPersonalPlan},
   '@/lib/membership/auth':{membershipUser:async()=>options.signedIn===false?null:{id:member}},
   '@/lib/membership/home-country':{homeCountryCurrency:()=> 'GBP'},
   '@/lib/membership/future-access':{reserveCheckout:async()=>{calls++;}},
  });
  const response=await route.POST(new Request('https://preview.example/api/membership/reservation',{method:'POST',body:JSON.stringify({action:'confirm',plan:'annual',currency:'GBP'})}));
  assert.equal(response.status,expected);assert.equal(calls,0);
 }
});
test('account and reservation confirmation show plan, actual price, dates and explicit future-payment consent',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),copy=require('../app/i18n/membership/en.json');
 const imports={'../i18n/membership':{useMembershipCopy:()=>({copy,lang:'en'})},'./membership.module.css':{default:{planSummary:'planSummary'}}};
 const AccountPlans=load('app/membership/account-plans.tsx',imports).default;
 const markup=renderToStaticMarkup(React.createElement(AccountPlans,{plans:[{plan:'monthly',provider:'stripe',currency:'GBP',amountMinor:299,periodEndsAt:new Date(start*1000).toISOString(),cancelAtPeriodEnd:false}]}));
 assert.match(markup,/Monthly subscription/);assert.match(markup,/£2\.99/);assert.match(markup,/Renews on/);
 const Dialog=load('app/membership/reservation-dialog.tsx',imports).default;
 const confirmation=renderToStaticMarkup(React.createElement(Dialog,{quote:{plan:'annual',currency:'GBP',amountMinor:1999,startsAt:new Date(start*1000).toISOString()},busy:false,onConfirm:()=>{},onClose:()=>{}}));
 assert.match(confirmation,/Charge now/);assert.match(confirmation,/£0\.00/);assert.match(confirmation,/£19\.99/);assert.match(confirmation,/type="checkbox"/);assert.match(confirmation,/disabled=""/);
});
test('failed future subscription payment stays visible until payment succeeds',async()=>{
 const f=fixture();await f.future.reserveCheckout(member,'monthly','GBP',new Date(start*1000).toISOString(),f.request);f.objects.session.status='complete';await f.future.completeReservation('cs_test_reserve',f.request);
 f.objects.schedule.status='active';f.objects.schedule.subscription='sub_future';let status='incomplete';
 const request=async(...args)=>args[0]==='/subscriptions/sub_future'?{livemode:false,customer:'cus_test',metadata:{member_id:member},status}:f.request(...args);
 assert.equal((await f.future.readReservation(f.customer,member,request)).state,'payment_pending');
 status='active';assert.equal(await f.future.readReservation(f.customer,member,request),null);
});
test('reservation webhooks grant no access for failed invoices and require the stored customer binding for paid invoices',async()=>{
 const f=fixture();let owner=true,writes=0;
 const invoice={id:'in_test',customer:'cus_test',livemode:false,status:'paid',currency:'gbp',total:149,metadata:{member_id:member,plan:'pass7',currency:'GBP',reservation_start:String(now-60),reservation_policy:'medicea-next-access-v1',reservation_price:'price_pass7GBP'},status_transitions:{paid_at:now},lines:{data:[{quantity:1,pricing:{price_details:{price:'price_pass7GBP'}}}],has_more:false}};
 const route=load('app/api/membership/webhook/route.ts',{
  '@/lib/membership/config':{membershipPreviewEnabled:()=>true},
  '@/lib/membership/store':{billingDb:()=>({$transaction:async fn=>fn({$queryRaw:async strings=>strings.join('').includes('stripe_customer')&&owner?[{member_id:member}]:[],$executeRaw:async()=>{writes++;}})})},
  '@/lib/membership/stripe':{...stripe,stripeRequest:async()=>invoice,verifyStripeSignature:raw=>JSON.parse(raw)},
  '@/lib/membership/future-access':f.future,
 });
 const request=type=>new Request('https://preview.example/api/membership/webhook',{method:'POST',body:JSON.stringify({livemode:false,type,data:{object:{id:'in_test',metadata:invoice.metadata}}})});
 assert.equal((await route.POST(request('invoice.payment_failed'))).status,200);assert.equal(writes,0);
 owner=false;assert.equal((await route.POST(request('invoice.paid'))).status,503);assert.equal(writes,0);
 owner=true;assert.equal((await route.POST(request('invoice.paid'))).status,200);assert.equal(writes,1);
});
test('portal reuses a safe configuration only after expanding the price settings Stripe omits by default',async()=>{
 const policy=load('lib/membership/portal-policy.ts',{'./config':config,'./stripe':stripe});let creates=0;
 const features={subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:true,proration_behavior:'none',default_allowed_updates:['price'],products:[{product:'prod_personal',prices:['price_monthlyGBP','price_annualGBP']}],schedule_at_period_end:{conditions:[{type:'decreasing_item_amount'},{type:'shortening_interval'}]}}};
 const signature='medicea-period-end-v2-GBP-price_monthlyGBP-price_annualGBP';
 const request=async(path,params,_key,_timeout,_version,query)=>{
  if(path.startsWith('/prices/'))return path.includes('monthly')?price('monthly'):price('annual');
  if(params){creates++;throw Error('Should reuse expanded configuration');}
  const returned=structuredClone(features);if(query?.get('expand[0]')!=='data.features.subscription_update.products')delete returned.subscription_update.products;
  return {data:[{id:'bpc_existing',active:true,livemode:false,metadata:{medicea_policy:signature},features:returned}]};
 };
 assert.equal(await policy.periodEndPortalConfiguration('GBP',request),'bpc_existing');assert.equal(creates,0);
 const omitted=structuredClone(features);delete omitted.subscription_update.products;
 assert.equal(policy.safePortalPolicy({active:true,livemode:false,features:omitted},['price_monthlyGBP','price_annualGBP']),false);
});
test('historical scheduled prices display actual terms, nullable quantity and expanded parent binding without changing active access',async()=>{
 const f=fixture(),plans=load('lib/membership/active-plans.ts',{'./config':config,'./stripe':stripe,'./store':{},'./future-access':f.future});const end=now+365*86400;
 const subscription={id:'sub_current',livemode:false,customer:'cus_test',metadata:{member_id:member},status:'active',currency:'gbp',schedule:'sub_sched_change',items:{data:[{price:price('annual'),current_period_end:end}]}};
 const schedule={id:'sub_sched_change',livemode:false,customer:'cus_test',subscription:{id:'sub_current'},phases:[{start_date:end,items:[{price:'price_oldMonthly',quantity:null}]}]};
 const legacy={...price('monthly'),id:'price_oldMonthly',unit_amount:249};
 const request=async path=>path.startsWith('/prices/')?legacy:path.startsWith('/subscription_schedules/')?schedule:subscription;
 const rows=[{provider:'stripe',external_id:'sub_current',customer_id:'cus_test',play_plan:null}];
 const result=await plans.resolveActivePlans(member,rows,request);assert.equal(result.planSummaries[0].scheduledChange.plan,'monthly');assert.equal(result.planSummaries[0].scheduledChange.amountMinor,249);assert.deepEqual(Array.from(result.activePlans),['annual']);
 legacy.product='prod_unrelated';const rejected=await plans.resolveActivePlans(member,rows,request);assert.equal(rejected.planSummaries[0].scheduledChange,undefined);assert.equal(rejected.planSummaries[0].scheduledChangeUnavailable,true);assert.deepEqual(Array.from(rejected.activePlans),['annual']);
});
