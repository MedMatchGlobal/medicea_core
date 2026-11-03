import {billingDb} from './store';
import {isPersonalPlan,type PersonalPlan} from './config';
import {stripeRequest,passAccess,subscriptionAccess,planPriceId} from './stripe';

type ActivePurchase={provider:string;external_id:string;customer_id:string|null;play_plan:string|null};
// Display metadata only: access itself is always decided by the server ledger.
export async function resolveActivePlans(member:string,rows:ActivePurchase[],request=(path:string)=>stripeRequest(path,undefined,undefined,4000)){
 const plans=new Set<PersonalPlan>(),playPlans=new Set<PersonalPlan>();let unavailable=false;
 await Promise.all(rows.map(async row=>{
  if(row.provider==='google_play'){
   if(isPersonalPlan(row.play_plan)){plans.add(row.play_plan);playPlans.add(row.play_plan);}else unavailable=true;
   return;
  }
  try{
   if(row.provider!=='stripe'||!row.customer_id)throw Error('Unknown purchase');
   const pass=/^cs_test_[a-zA-Z0-9]+$/.test(row.external_id);
   if(!pass&&!/^sub_[a-zA-Z0-9]+$/.test(row.external_id))throw Error('Unknown purchase');
   const purchase=await request((pass?'/checkout/sessions/':'/subscriptions/')+row.external_id);
   if(purchase.id!==row.external_id||purchase.livemode!==false||purchase.metadata?.member_id!==member||purchase.customer!==row.customer_id)throw Error('Purchase binding unavailable');
   if(pass){
    if(purchase.client_reference_id!==member)throw Error('Pass binding unavailable');
    const items=await request('/checkout/sessions/'+row.external_id+'/line_items');
    passAccess(purchase,items,purchase.created);
    if(!isPersonalPlan(purchase.metadata.plan))throw Error('Unknown pass');
    plans.add(purchase.metadata.plan);
   }else{
    if(!subscriptionAccess(purchase).active)throw Error('Subscription inactive');
    const matches=(['monthly','annual'] as const).filter(plan=>{
     try{return purchase.items.data.some((item:any)=>item.price?.id===planPriceId(plan));}catch{return false;}
    });
    if(matches.length!==1)throw Error('Ambiguous subscription');
    plans.add(matches[0]);
   }
  }catch{unavailable=true;}
 }));
 return {activePlans:[...plans],activePlayPlans:[...playPlans],planDetailsUnavailable:unavailable||rows.length===0};
}
export async function membershipPlans(member:string){
 try{
  const rows=await billingDb().$queryRaw<ActivePurchase[]>`
   SELECT e.provider,e.external_id,e.customer_id,p.plan AS play_plan
   FROM medicea_billing.entitlement e
   LEFT JOIN medicea_billing.play_purchase p ON e.provider='google_play'
    AND p.token=e.external_id AND p.member_id=e.member_id AND NOT p.superseded AND NOT p.revoked
   WHERE e.member_id=${member}::uuid AND e.active AND e.valid_until>now()
   ORDER BY e.valid_until DESC LIMIT 5`;
  return await resolveActivePlans(member,rows);
 }catch{return {activePlans:[] as PersonalPlan[],activePlayPlans:[] as PersonalPlan[],planDetailsUnavailable:true};}
}
