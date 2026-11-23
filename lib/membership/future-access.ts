import {billingDb} from './store';
import {isPersonalPlan,isBillingCurrency,PERSONAL_PLANS,planAmount,membershipOrigin,type PersonalPlan,type BillingCurrency} from './config';
import {stripeRequest,passAccess,validatePrice,planPriceId} from './stripe';

const policy='medicea-next-access-v1';
const key='medicea_next_access';
type Record={session:string;id?:string;kind:'invoice'|'schedule';plan:PersonalPlan;currency:BillingCurrency;start:number};
type Request=typeof stripeRequest;
// Future invoice finalization and phase duration use this explicit API contract only.
const reservationRequest:Request=(path,params,idempotencyKey,timeoutMs,_version,query)=>stripeRequest(path,params,idempotencyKey,timeoutMs,'2026-11-18.endive',query);
export type Reservation={plan:PersonalPlan;currency:BillingCurrency;amountMinor:number;startsAt:string;state:'preparing'|'reserved'|'payment_pending'};
const iso=(seconds:number)=>new Date(seconds*1000).toISOString();
function record(customer:any):Record|null {
  if(!customer.metadata?.[key])return null;
  const value=JSON.parse(customer.metadata[key]);
  if(!/^cs_test_[a-zA-Z0-9]+$/.test(value.session)||!isPersonalPlan(value.plan)||!isBillingCurrency(value.currency)||!Number.isSafeInteger(value.start)||!['invoice','schedule'].includes(value.kind))throw Error('Invalid reservation');
  if(value.id&&!(value.kind==='invoice'?/^in_[a-zA-Z0-9]+$/:/^sub_sched_[a-zA-Z0-9]+$/).test(value.id))throw Error('Invalid reservation reference');
  return value;
}
function binding(object:any,customer:string,member:string) {
  if(object.livemode!==false||object.customer!==customer||object.metadata?.member_id!==member||object.metadata?.reservation_policy!==policy)throw Error('Reservation ownership mismatch');
}
async function putRecord(customer:string,value:Record,request:Request) {
  await request('/customers/'+customer,new URLSearchParams({[`metadata[${key}]`]:JSON.stringify(value)}));
}
async function previousSchedule(customer:string,session:string,request:Request){
  // Idempotency keys expire after 24 hours. Recover by immutable setup-session metadata too.
  const query=new URLSearchParams({customer,limit:'100'});
  for(let page=0;page<10;page++){
    const result=await request('/subscription_schedules',undefined,undefined,15000,undefined,query);
    const found=result.data?.find((schedule:any)=>schedule.metadata?.reservation_session===session);
    if(found)return found;
    if(!result.has_more)return null;
    const last=result.data?.at(-1)?.id;if(!last)throw Error('Schedule pagination unavailable');query.set('starting_after',last);
  }
  throw Error('Reservation history unavailable');
}
export async function readReservation(customer:any,member:string,request:Request=reservationRequest):Promise<Reservation|null> {
  if(customer.livemode!==false||customer.metadata?.member_id!==member)throw Error('Customer mismatch');
  const value=record(customer);if(!value)return null;
  let state:Reservation['state']='preparing';
  if(value.id){
    const object=await request((value.kind==='invoice'?'/invoices/':'/subscription_schedules/')+value.id);
    binding(object,customer.id,member);
    if(object.metadata.reservation_cancelled==='true')return null;
    if(value.kind==='invoice') {
      if(!['draft','open'].includes(object.status))return null;
      state=object.status==='open'?'payment_pending':object.auto_advance===true?'reserved':'preparing';
    } else {
      if(object.status==='not_started')state='reserved';
      else if(object.status==='active'&&typeof object.subscription==='string'){
        const subscription=await request('/subscriptions/'+object.subscription);
        if(subscription.livemode!==false||subscription.customer!==customer.id||subscription.metadata?.member_id!==member)throw Error('Subscription mismatch');
        if(!['incomplete','past_due','unpaid'].includes(subscription.status))return null;
        state='payment_pending';
      }else return null;
    }
  }
  return {plan:value.plan,currency:value.currency,amountMinor:planAmount(value.plan,value.currency),startsAt:iso(value.start),state};
}
export async function memberReservation(member:string,request:Request=reservationRequest) {
  const customers=await billingDb().$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid`;
  if(!customers.length)return null;
  return readReservation(await request('/customers/'+customers[0].customer_id),member,request);
}

// Only one-time Stripe passes can reserve new access here. Recurring plans change through Stripe's portal.
export async function reservationWindow(tx:any,member:string,request:Request=reservationRequest) {
  const rows=await tx.$queryRaw`SELECT provider,external_id,customer_id,valid_until FROM medicea_billing.entitlement WHERE member_id=${member}::uuid AND active AND valid_until>now() ORDER BY valid_until DESC LIMIT 6` as Array<any>;
  if(!rows.length||rows.length>5||rows.some(row=>row.provider!=='stripe'||!(/^(?:cs_test_|in_)[a-zA-Z0-9]+$/.test(row.external_id))))throw Error('ACTIVE_PASS_REQUIRED');
  const customers=await tx.$queryRaw`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid` as Array<{customer_id:string}>;
  if(customers.length!==1)throw Error('Customer mismatch');
  const customer=customers[0].customer_id;
  for(const row of rows){
    if(row.external_id.startsWith('in_')){
      const invoice=await request('/invoices/'+row.external_id);
      if(row.customer_id!==customer||invoice.customer!==customer||invoice.metadata?.member_id!==member)throw Error('Purchase mismatch');
      if(!reservedPassAccess(invoice).active)throw Error('Pass inactive');
      continue;
    }
    const purchase=await request('/checkout/sessions/'+row.external_id);
    const items=await request('/checkout/sessions/'+row.external_id+'/line_items');
    if(row.customer_id!==customer||purchase.customer!==customer||purchase.metadata?.member_id!==member||purchase.client_reference_id!==member)throw Error('Purchase mismatch');
    passAccess(purchase,items,purchase.created);
  }
  const start=Math.floor(Math.max(...rows.map(row=>new Date(row.valid_until).getTime()))/1000);
  if(!Number.isSafeInteger(start)||start<=Math.floor(Date.now()/1000)+300)throw Error('PASS_ENDING_SOON');
  return {customer,start};
}
export async function reserveCheckout(member:string,plan:PersonalPlan,currency:BillingCurrency,confirmedStart?:string,request:Request=reservationRequest) {
  return billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${member}::text,0))::text AS result`;
    const {customer,start}=await reservationWindow(tx,member,request);
    if(await readReservation(await request('/customers/'+customer),member,request))throw Error('RESERVATION_EXISTS');
    const quote={plan,currency,amountMinor:planAmount(plan,currency),startsAt:iso(start)};
    if(!confirmedStart)return quote;
    if(confirmedStart!==quote.startsAt)throw Error('RESERVATION_CHANGED');
    await validatePrice(plan,currency);
    const existing=await tx.$queryRaw<Array<{session_id:string}>>`SELECT session_id FROM medicea_billing.checkout WHERE member_id=${member}::uuid AND expires_at>now()`;
    if(existing.length){
      const previous=await request('/checkout/sessions/'+existing[0].session_id);
      if(previous.status==='open'&&previous.mode==='setup'&&previous.metadata?.plan===plan&&previous.metadata?.currency===currency&&previous.metadata?.reservation_start===String(start))return {...quote,url:previous.url};
      if(previous.status==='open')await request('/checkout/sessions/'+existing[0].session_id+'/expire',new URLSearchParams());
    }
    const amount=new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(quote.amountMinor/100);
    const date=new Date(start*1000).toLocaleDateString('en-GB',{timeZone:'UTC'});
    const params=new URLSearchParams({mode:'setup',customer,currency:currency.toLowerCase(),client_reference_id:member,
      'payment_method_types[0]':'card','metadata[member_id]':member,'metadata[plan]':plan,'metadata[currency]':currency,
      'metadata[reservation_policy]':policy,'metadata[reservation_start]':String(start),
      'custom_text[submit][message]':`Reserve ${PERSONAL_PLANS[plan].label}. No charge now. You authorise ${amount} on or after ${date}, once your current pass ends.${PERSONAL_PLANS[plan].kind==='subscription'?' This subscription renews until cancelled.':' One payment only; no renewal.'}`,
      success_url:membershipOrigin()+'/membership?checkout=returned',cancel_url:membershipOrigin()+'/membership?checkout=cancelled'});
    const bucket=Math.floor(Date.now()/1800000);
    const session=await request('/checkout/sessions',params,`reserve-${member}-${plan}-${currency}-${start}-${bucket}-${existing[0]?.session_id||'new'}`);
    const url=new URL(session.url);
    if(session.livemode!==false||url.hostname!=='checkout.stripe.com'||url.protocol!=='https:')throw Error('Invalid setup checkout');
    await tx.$executeRaw`INSERT INTO medicea_billing.checkout(member_id,session_id,plan,url,expires_at) VALUES(${member}::uuid,${session.id},${plan},${session.url},${new Date(session.expires_at*1000)}) ON CONFLICT(member_id) DO UPDATE SET session_id=excluded.session_id,plan=excluded.plan,url=excluded.url,expires_at=excluded.expires_at`;
    return {...quote,url:session.url};
  },{timeout:60000});
}

export async function completeReservation(sessionId:string,request:Request=reservationRequest) {
  const session=await request('/checkout/sessions/'+sessionId);
  if(session.metadata?.reservation_processed==='true')return;
  const member=session.metadata?.member_id,plan=session.metadata?.plan,currency=session.metadata?.currency;
  const start=Number(session.metadata?.reservation_start);
  if(session.livemode!==false||session.mode!=='setup'||session.status!=='complete'||session.metadata?.reservation_policy!==policy||!isPersonalPlan(plan)||!isBillingCurrency(currency)||!Number.isSafeInteger(start)||session.client_reference_id!==member||!/^[0-9a-f-]{36}$/i.test(member))throw Error('Invalid reservation setup');
  await billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${member}::text,0))::text AS result`;
    const owners=await tx.$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid AND customer_id=${session.customer}`;
    if(owners.length!==1)throw Error('Customer mismatch');
    const customer=await request('/customers/'+session.customer);
    if(customer.livemode!==false||customer.metadata?.member_id!==member)throw Error('Customer mismatch');
    let value=record(customer);
    if(value?.session!==sessionId){
      if(await readReservation(customer,member,request))throw Error('RESERVATION_EXISTS');
      const window=await reservationWindow(tx,member,request);
      if(window.start!==start)throw Error('RESERVATION_CHANGED');
      value={session:sessionId,kind:PERSONAL_PLANS[plan].kind==='pass'?'invoice':'schedule',plan,currency,start};
      await putRecord(customer.id,value,request);
    }
    if(!value)throw Error('Reservation missing');
    const intentId=typeof session.setup_intent==='string'?session.setup_intent:session.setup_intent?.id;
    if(!/^seti_[a-zA-Z0-9]+$/.test(intentId))throw Error('Missing setup intent');
    const intent=await request('/setup_intents/'+intentId);
    if(intent.livemode!==false||intent.status!=='succeeded'||intent.customer!==customer.id||!/^pm_[a-zA-Z0-9]+$/.test(intent.payment_method))throw Error('Invalid saved payment method');
    const price=await validatePrice(plan,currency);
    const metadata={'metadata[member_id]':member,'metadata[reservation_policy]':policy,'metadata[reservation_session]':sessionId,'metadata[plan]':plan,'metadata[currency]':currency,'metadata[reservation_start]':String(start),'metadata[reservation_price]':price};
    if(!value.id){
      if(start<=Math.floor(Date.now()/1000))throw Error('RESERVATION_EXPIRED');
      if(value.kind==='invoice'){
        // Keep the invoice unarmed until its single, validated line and account pointer exist.
        const invoice=await request('/invoices',new URLSearchParams({customer:customer.id,currency:currency.toLowerCase(),collection_method:'charge_automatically',auto_advance:'false',default_payment_method:intent.payment_method,pending_invoice_items_behavior:'exclude',...metadata}),'reserve-invoice-'+sessionId);
        binding(invoice,customer.id,member);
        if(!/^in_[a-zA-Z0-9]+$/.test(invoice.id))throw Error('Invalid invoice');
        await request('/invoiceitems',new URLSearchParams({customer:customer.id,invoice:invoice.id,'pricing[price]':price,quantity:'1'}),'reserve-line-'+sessionId);
        value.id=invoice.id;
      }else{
        const schedule=await previousSchedule(customer.id,sessionId,request)||await request('/subscription_schedules',new URLSearchParams({customer:customer.id,start_date:String(start),end_behavior:'release',
          'default_settings[default_payment_method]':intent.payment_method,'phases[0][items][0][price]':price,'phases[0][items][0][quantity]':'1',
          'phases[0][duration][interval]':PERSONAL_PLANS[plan].interval!,'phases[0][duration][interval_count]':'1','phases[0][proration_behavior]':'none',
          'phases[0][metadata][member_id]':member,...metadata}),'reserve-schedule-'+sessionId);
        binding(schedule,customer.id,member);value.id=schedule.id;
        if(!/^sub_sched_[a-zA-Z0-9]+$/.test(value.id!))throw Error('Invalid schedule');
        if(schedule.status!=='not_started'||schedule.phases?.[0]?.start_date!==start){
          await request('/subscription_schedules/'+value.id+'/cancel',new URLSearchParams());throw Error('Unexpected scheduled start');
        }
      }
      await putRecord(customer.id,value,request);
    }
    if(value.kind==='invoice'){
      const invoice=await request('/invoices/'+value.id);
      binding(invoice,customer.id,member);
      if(invoice.status==='draft'&&invoice.metadata.reservation_cancelled!=='true'){
        const lines=invoice.lines?.data,priceId=lines?.[0]?.pricing?.price_details?.price||lines?.[0]?.price?.id;
        if(invoice.total!==planAmount(plan,currency)||invoice.currency!==currency.toLowerCase()||invoice.lines?.has_more||lines?.length!==1||priceId!==price||lines[0].quantity!==1)throw Error('Unexpected reserved invoice');
        const armed=await request('/invoices/'+value.id,new URLSearchParams({auto_advance:'true',automatically_finalizes_at:String(start)}),'reserve-arm-'+sessionId);
        if(armed.auto_advance!==true||armed.automatically_finalizes_at!==start){await request('/invoices/'+value.id,new URLSearchParams({auto_advance:'false'}));throw Error('Unexpected invoice charge date');}
      }
    }
    await request('/checkout/sessions/'+sessionId,new URLSearchParams({'metadata[reservation_processed]':'true'}));
    await tx.$executeRaw`DELETE FROM medicea_billing.checkout WHERE member_id=${member}::uuid AND session_id=${sessionId}`;
  },{timeout:60000});
}

export async function cancelReservation(member:string,request:Request=reservationRequest) {
  await billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${member}::text,0))::text AS result`;
    const customers=await tx.$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid`;
    if(customers.length!==1)throw Error('Customer mismatch');
    const customer=await request('/customers/'+customers[0].customer_id);
    const reservation=await readReservation(customer,member,request),value=record(customer);
    if(!reservation||!value?.id||value.start<=Math.floor(Date.now()/1000))throw Error('RESERVATION_NOT_CANCELLABLE');
    if(value.kind==='invoice')await request('/invoices/'+value.id,new URLSearchParams({auto_advance:'false','metadata[reservation_cancelled]':'true'}));
    else await request('/subscription_schedules/'+value.id+'/cancel',new URLSearchParams());
  },{timeout:30000});
}

export function reservedPassAccess(invoice:any,now=Date.now()) {
  const plan=invoice.metadata?.plan,currency=invoice.metadata?.currency,start=Number(invoice.metadata?.reservation_start);
  if(!isPersonalPlan(plan)||PERSONAL_PLANS[plan].kind!=='pass'||!isBillingCurrency(currency)||invoice.metadata.reservation_policy!==policy||invoice.metadata.reservation_price!==planPriceId(plan,currency)||invoice.metadata.reservation_cancelled==='true')throw Error('Invalid reserved pass');
  const lines=invoice.lines?.data,paid=invoice.status_transitions?.paid_at;
  const price=lines?.[0]?.pricing?.price_details?.price||lines?.[0]?.price?.id;
  if(invoice.livemode!==false||invoice.status!=='paid'||invoice.total!==planAmount(plan,currency)||invoice.currency!==currency.toLowerCase()||!Number.isSafeInteger(start)||!Number.isSafeInteger(paid)||paid<start||paid>Math.floor(now/1000)+300||invoice.lines?.has_more||lines?.length!==1||price!==planPriceId(plan,currency)||lines[0].quantity!==1)throw Error('Unexpected reserved pass payment');
  const until=new Date((paid+Number(PERSONAL_PLANS[plan].days)*86400)*1000);
  return {active:until.getTime()>now,until};
}
