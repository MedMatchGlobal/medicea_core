import {billingDb} from './store';
import {isPersonalPlan,isBillingCurrency,planAmount,BILLING_CURRENCIES,type BillingCurrency,type PersonalPlan} from './config';
import {stripeRequest,passAccess,subscriptionAccess,subscriptionPriceIds,planPriceId} from './stripe';
import {reservedPassAccess} from './future-access';

type ActivePurchase={provider:string;external_id:string;customer_id:string|null;play_plan:string|null;valid_until?:string|Date};
export type PlanSummary={plan:PersonalPlan;provider:string;periodEndsAt:string|null;currency:BillingCurrency|null;amountMinor:number|null;cancelAtPeriodEnd:boolean;scheduledChange?:{plan:PersonalPlan;startsAt:string;currency:BillingCurrency;amountMinor:number};scheduledChangeUnavailable?:boolean};
// Display metadata only: access itself is always decided by the server ledger.
export async function resolveActivePlans(member:string,rows:ActivePurchase[],request=(path:string)=>stripeRequest(path,undefined,undefined,4000)){
 const plans=new Set<PersonalPlan>(),playPlans=new Set<PersonalPlan>(),summaries:PlanSummary[]=[];let unavailable=false;
 await Promise.all(rows.map(async row=>{
  if(row.provider==='google_play'){
   if(isPersonalPlan(row.play_plan)){plans.add(row.play_plan);playPlans.add(row.play_plan);summaries.push({plan:row.play_plan,provider:'google_play',periodEndsAt:row.valid_until?new Date(row.valid_until).toISOString():null,currency:null,amountMinor:null,cancelAtPeriodEnd:false});}else unavailable=true;
   return;
  }
  try{
   if(row.provider!=='stripe'||!row.customer_id)throw Error('Unknown purchase');
   const pass=/^cs_test_[a-zA-Z0-9]+$/.test(row.external_id);
   const invoice=/^in_[a-zA-Z0-9]+$/.test(row.external_id);
   if(!pass&&!invoice&&!/^sub_[a-zA-Z0-9]+$/.test(row.external_id))throw Error('Unknown purchase');
   const purchase=await request((pass?'/checkout/sessions/':invoice?'/invoices/':'/subscriptions/')+row.external_id);
   if(purchase.id!==row.external_id||purchase.livemode!==false||purchase.metadata?.member_id!==member||purchase.customer!==row.customer_id)throw Error('Purchase binding unavailable');
   if(pass||invoice){
    if(pass&&purchase.client_reference_id!==member)throw Error('Pass binding unavailable');
    const access=invoice?reservedPassAccess(purchase):passAccess(purchase,await request('/checkout/sessions/'+row.external_id+'/line_items'),purchase.created);
    if(!isPersonalPlan(purchase.metadata.plan))throw Error('Unknown pass');
    plans.add(purchase.metadata.plan);
    const currency=purchase.metadata.currency||'GBP';
    summaries.push({plan:purchase.metadata.plan,provider:'stripe',periodEndsAt:row.valid_until?new Date(row.valid_until).toISOString():access.until.toISOString(),currency,amountMinor:planAmount(purchase.metadata.plan,currency),cancelAtPeriodEnd:false});
   }else{
    if(!subscriptionAccess(purchase).active)throw Error('Subscription inactive');
    const matches=(['monthly','annual'] as const).filter(plan=>{
     try{return purchase.items.data.some((item:any)=>subscriptionPriceIds(plan).includes(item.price?.id));}catch{return false;}
    });
    if(matches.length!==1)throw Error('Ambiguous subscription');
    plans.add(matches[0]);
    const item=purchase.items.data.find((item:any)=>subscriptionPriceIds(matches[0]).includes(item.price?.id));
    const code=(purchase.currency||item.price?.currency||'').toUpperCase();
    const summary:PlanSummary={plan:matches[0],provider:'stripe',periodEndsAt:new Date(item.current_period_end*1000).toISOString(),currency:isBillingCurrency(code)?code:null,amountMinor:Number.isSafeInteger(item.price?.unit_amount)?item.price.unit_amount:null,cancelAtPeriodEnd:purchase.cancel_at_period_end===true||!!(purchase.cancel_at&&purchase.cancel_at<=item.current_period_end)};
    if(purchase.schedule){
     try{
      const id=typeof purchase.schedule==='string'?purchase.schedule:purchase.schedule.id;
      if(!/^sub_sched_[a-zA-Z0-9]+$/.test(id))throw Error('Unknown schedule');
      const schedule=await request('/subscription_schedules/'+id);
      if(schedule.id!==id||schedule.livemode!==false||schedule.customer!==row.customer_id||schedule.subscription!==purchase.id)throw Error('Schedule binding mismatch');
      const next=schedule.phases?.find((phase:any)=>phase.start_date>=item.current_period_end&&phase.items?.length===1);
      if(next){
       const price=typeof next.items[0].price==='string'?next.items[0].price:next.items[0].price?.id;
       const nextPlan=(['monthly','annual'] as const).find(plan=>subscriptionPriceIds(plan).includes(price));
       if(!nextPlan||next.items[0].quantity!==1)throw Error('Unknown scheduled plan');
       const currency=BILLING_CURRENCIES.find(currency=>{try{return planPriceId(nextPlan,currency)===price;}catch{return false;}});
       if(!currency)throw Error('Unknown scheduled price');
       summary.scheduledChange={plan:nextPlan,startsAt:new Date(next.start_date*1000).toISOString(),currency,amountMinor:planAmount(nextPlan,currency)};
      }
     }catch{summary.scheduledChangeUnavailable=true;}
    }
    summaries.push(summary);
   }
  }catch{unavailable=true;}
 }));
 return {activePlans:[...plans],activePlayPlans:[...playPlans],planSummaries:summaries,canReserve:!unavailable&&summaries.length>0&&summaries.every(summary=>summary.provider==='stripe'&&summary.plan.startsWith('pass')),planDetailsUnavailable:unavailable||rows.length===0};
}
export async function membershipPlans(member:string){
 // Management remains available even when provider plan metadata cannot be loaded.
 let canManageStripe=false,canManageGooglePlay=false;
 try{
  const customers=await billingDb().$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid`;
  canManageStripe=customers.some(row=>/^cus_[a-zA-Z0-9]+$/.test(row.customer_id));
 }catch{/* Do not guess a provider if its account binding is unavailable. */}
 try{
  const rows=await billingDb().$queryRaw<ActivePurchase[]>`
   SELECT e.provider,e.external_id,e.customer_id,e.valid_until,p.plan AS play_plan
   FROM medicea_billing.entitlement e
   LEFT JOIN medicea_billing.play_purchase p ON e.provider='google_play'
    AND p.token=e.external_id AND p.member_id=e.member_id AND NOT p.superseded AND NOT p.revoked
   WHERE e.member_id=${member}::uuid AND e.active AND e.valid_until>now()
   ORDER BY e.valid_until DESC LIMIT 5`;
  canManageGooglePlay=rows.some(row=>row.provider==='google_play'&&(row.play_plan==='monthly'||row.play_plan==='annual'));
  return {...await resolveActivePlans(member,rows),canManageStripe,canManageGooglePlay};
 }catch{return {activePlans:[] as PersonalPlan[],activePlayPlans:[] as PersonalPlan[],planDetailsUnavailable:true,canManageStripe,canManageGooglePlay};}
}
