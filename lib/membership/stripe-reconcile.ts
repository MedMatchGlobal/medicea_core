import {billingDb} from './store';
import {stripeRequest,subscriptionAccess} from './stripe';
import {reservedPassAccess} from './future-access';
import {purchaseSettled} from './settlement';
export async function reconcileStripeCustomer(customer:string){
 if(!/^cus_[a-zA-Z0-9]+$/.test(customer))throw Error('Invalid customer');
 return billingDb().$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${customer}::text,2))::text AS result`;
  const owners=await tx.$queryRaw<Array<{member_id:string}>>`SELECT member_id::text FROM medicea_billing.stripe_customer WHERE customer_id=${customer}`;
  if(!owners.length)return 0;if(owners.length!==1)throw Error('Invalid customer ownership');
  const member=owners[0].member_id;
  const rows=await tx.$queryRaw<Array<{external_id:string;valid_until:Date}>>`SELECT external_id,valid_until FROM medicea_billing.entitlement WHERE provider='stripe' AND customer_id=${customer} AND member_id=${member}::uuid ORDER BY valid_until DESC LIMIT 101`;
  if(rows.length>100)throw Error('Reconciliation requires pagination');
  let updated=0;
  for(const row of rows){
   let source:any,active=false,until=row.valid_until;
   if(/^cs_test_[a-zA-Z0-9]+$/.test(row.external_id)){
    source=await stripeRequest('/checkout/sessions/'+row.external_id);
    if(source.mode!=='payment'||source.client_reference_id!==member)throw Error('Invalid checkout binding');
    active=new Date(until).getTime()>Date.now()&&source.status==='complete'&&source.payment_status==='paid'&&await purchaseSettled(source,'checkout');
   }else if(/^in_[a-zA-Z0-9]+$/.test(row.external_id)){
    source=await stripeRequest('/invoices/'+row.external_id);
    const access=reservedPassAccess(source);until=access.until;active=access.active&&await purchaseSettled(source,'invoice');
   }else if(/^sub_[a-zA-Z0-9]+$/.test(row.external_id)){
    source=await stripeRequest('/subscriptions/'+row.external_id);
    const access=subscriptionAccess(source);until=access.until;active=access.active&&await purchaseSettled(source,'subscription');
   }else throw Error('Unknown purchase type');
   if(source.livemode!==false||source.customer!==customer||source.metadata?.member_id!==member)throw Error('Purchase ownership mismatch');
   await tx.$executeRaw`UPDATE medicea_billing.entitlement SET active=${active},valid_until=${until} WHERE provider='stripe' AND external_id=${row.external_id} AND member_id=${member}::uuid AND customer_id=${customer}`;updated++;
  }
  return updated;
 },{timeout:60000});
}
