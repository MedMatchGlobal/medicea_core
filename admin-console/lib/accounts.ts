import {db,audit} from './db';
import {ConsoleError,memberId} from './policy';
import {stripe} from './stripe';
export async function accounts(actor:string,query:string,after?:string){
 if(query.length>200)throw new ConsoleError('INVALID_SEARCH');if(after)memberId(after);
 await audit(actor,'accounts.list',null,null,{filtered:!!query});
 const result=await db().query(`SELECT u.id,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,
  (SELECT count(*)::int FROM medicea_billing.entitlement e WHERE e.member_id=u.id AND e.active AND e.valid_until>now()) AS active_purchases,
  EXISTS(SELECT 1 FROM medicea_billing.complimentary_access c WHERE lower(c.email)=lower(u.email) AND c.active) AS complimentary
  FROM medicea_billing.console_account u WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.id::text=$1)
  AND ($2::uuid IS NULL OR u.id>$2::uuid) ORDER BY u.id LIMIT 51`,[query,after||null]);
 return {accounts:result.rows.slice(0,50),hasMore:result.rows.length>50,next:result.rows.length>50?result.rows[49].id:null};
}
export async function customerFor(member:string){
 memberId(member);const result=await db().query('SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=$1',[member]);
 if(result.rows.length!==1||!/^cus_[A-Za-z0-9]+$/.test(result.rows[0].customer_id))throw new ConsoleError('NO_STRIPE_ACCOUNT',404);
 const customer=await stripe('/customers/'+result.rows[0].customer_id);
 if(customer.deleted||customer.livemode!==false||customer.metadata?.member_id!==member)throw new ConsoleError('CUSTOMER_BINDING_INVALID',409);
 return customer;
}
export async function charges(customer:string,after?:string){
 if(after&&!/^ch_[A-Za-z0-9]+$/.test(after))throw new ConsoleError('INVALID_CURSOR');
 const query=new URLSearchParams({customer,limit:'20'});if(after)query.set('starting_after',after);
 const result=await stripe('/charges',undefined,undefined,query);if(!Array.isArray(result.data))throw new ConsoleError('PROVIDER_DATA_INVALID',502);
 const rows=result.data.map((c:any)=>{
  if(c.livemode!==false||c.customer!==customer||!/^ch_[A-Za-z0-9]+$/.test(c.id))throw new ConsoleError('PURCHASE_BINDING_INVALID',409);
  return {id:c.id,created:c.created,currency:c.currency?.toUpperCase(),amountMinor:c.amount,refundedMinor:c.amount_refunded,status:c.status,paid:c.paid===true,disputed:c.disputed===true,description:c.description||null};
 });
 return {payments:rows,hasMore:result.has_more===true,next:result.has_more===true?result.data.at(-1)?.id:null};
}
export async function account(actor:string,member:string,after?:string){
 memberId(member);await audit(actor,'account.view',member,null);
 const user=await db().query(`SELECT id,email,created_at,last_sign_in_at,email_confirmed_at,
  home_country FROM medicea_billing.console_account WHERE id=$1`,[member]);
 if(!user.rows.length)throw new ConsoleError('ACCOUNT_NOT_FOUND',404);
 const [entitlements,play,operations]=await Promise.all([
  db().query("SELECT provider,external_id AS purchase,active,valid_until FROM medicea_billing.console_entitlement WHERE member_id=$1 ORDER BY valid_until DESC LIMIT 100",[member]),
  db().query('SELECT plan,fulfilled,revoked,superseded,verified_at,voided_order_id FROM medicea_billing.play_purchase WHERE member_id=$1 ORDER BY verified_at DESC LIMIT 100',[member]),
  db().query('SELECT id,action,amount_minor,currency,state,reason,result,payload,created_at FROM medicea_billing.console_operation WHERE member_id=$1 ORDER BY created_at DESC LIMIT 100',[member])
 ]);
 let provider:any={available:false,state:'unavailable',payments:[],hasMore:false,subscriptions:[],schedules:[],future:[],passes:[]};
 try{
  const customer=await customerFor(member);
  const [history,subscriptions,schedules]=await Promise.all([charges(customer.id,after),stripe('/subscriptions',undefined,undefined,new URLSearchParams({customer:customer.id,status:'all',limit:'100'})),stripe('/subscription_schedules',undefined,undefined,new URLSearchParams({customer:customer.id,limit:'100'}))]);
  const check=(object:any)=>{if(object.livemode!==false||object.customer!==customer.id)throw new ConsoleError('PURCHASE_BINDING_INVALID',409);};
  const passes=[];
  for(const row of entitlements.rows.filter(r=>r.provider==='stripe'&&r.active&&new Date(r.valid_until)>new Date()&&/^(cs_test_|in_)/.test(r.purchase))){
   const purchase=await stripe((row.purchase.startsWith('cs_test_')?'/checkout/sessions/':'/invoices/')+row.purchase);check(purchase);
   if(purchase.metadata?.member_id!==member)throw new ConsoleError('PURCHASE_BINDING_INVALID',409);
   passes.push({plan:purchase.metadata?.plan||'Travel pass',amountMinor:purchase.amount_total??purchase.total,currency:purchase.currency?.toUpperCase(),endsAt:row.valid_until});
  }
  const future=[];
  const raw=customer.metadata?.medicea_next_access;
  if(raw){
   const reserved=JSON.parse(raw);
   if(reserved.kind==='invoice'&&/^in_[A-Za-z0-9]+$/.test(reserved.id)){
    const invoice=await stripe('/invoices/'+reserved.id);check(invoice);
    if(invoice.metadata?.member_id!==member)throw new ConsoleError('PURCHASE_BINDING_INVALID',409);
    if(['draft','open'].includes(invoice.status)&&invoice.metadata?.reservation_cancelled!=='true')future.push({kind:'Reserved pass',plan:reserved.plan,startsAt:reserved.start,amountMinor:invoice.total,currency:invoice.currency?.toUpperCase(),status:invoice.status});
   }
  }
  for(const s of schedules.data.filter((s:any)=>['not_started','active'].includes(s.status))){
   check(s);
   for(const phase of s.phases.filter((p:any)=>p.start_date>Date.now()/1000||s.status==='not_started')){
    const id=typeof phase.items?.[0]?.price==='string'?phase.items[0].price:phase.items?.[0]?.price?.id;
    if(!/^price_[A-Za-z0-9]+$/.test(id))throw new ConsoleError('PRICE_DETAILS_UNAVAILABLE',502);
    const price=await stripe('/prices/'+id);if(price.livemode!==false)throw new ConsoleError('LIVE_DATA_REJECTED',502);
    future.push({kind:'Scheduled subscription',plan:price.recurring?.interval==='month'?'Monthly subscription':price.recurring?.interval==='year'?'Annual subscription':s.metadata?.plan||'Scheduled plan',startsAt:phase.start_date,amountMinor:price.unit_amount,currency:price.currency?.toUpperCase(),status:s.status});
   }
  }
  provider={available:true,state:'ready',...history,passes,future,name:customer.name||null,email:customer.email||null,address:customer.address||null,
   subscriptions:subscriptions.data.map((s:any)=>{check(s);return {id:s.id,status:s.status,plan:s.metadata?.plan||s.items?.data?.[0]?.price?.recurring?.interval,amountMinor:s.items?.data?.[0]?.price?.unit_amount,currency:s.currency?.toUpperCase(),periodEndsAt:s.items?.data?.[0]?.current_period_end,cancelAtPeriodEnd:s.cancel_at_period_end};}),
   schedules:schedules.data.filter((s:any)=>s.status==='not_started'||s.status==='active').map((s:any)=>{check(s);return {id:s.id,status:s.status,phases:s.phases.map((p:any)=>({startsAt:p.start_date,endsAt:p.end_date,price:p.items?.[0]?.price}))};}),
   moreSubscriptions:subscriptions.has_more===true,moreSchedules:schedules.has_more===true};
 }catch(error){
  if(error instanceof ConsoleError&&error.code==='NO_STRIPE_ACCOUNT')provider={...provider,state:'not_linked'};
  else provider={...provider,error:'Stripe details unavailable. Refresh before taking action.'};
 }
 return {user:user.rows[0],entitlements:entitlements.rows.map(({purchase,...row})=>row),playPurchases:play.rows,operations:operations.rows,stripe:provider};
}
