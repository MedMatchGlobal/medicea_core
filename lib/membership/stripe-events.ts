import {billingDb} from '@/lib/membership/store';
import {stripeRequest,subscriptionAccess,passAccess} from '@/lib/membership/stripe';
import {completeReservation,reservedPassAccess} from '@/lib/membership/future-access';
import {purchaseSettled} from '@/lib/membership/settlement';
import {reconcileStripeCustomer} from '@/lib/membership/stripe-reconcile';
export const stripeEventTypes=['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','checkout.session.completed','invoice.paid','invoice.payment_failed','charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'];
export async function processStripeEvent(event:any){
 if(event.livemode!==false)return new Response(null,{status:400});
 if(!stripeEventTypes.includes(event.type))return Response.json({received:true});
 const object=event.data?.object;
 if(event.type==='charge.refunded'||event.type.startsWith('charge.dispute.')){
  const chargeId=event.type==='charge.refunded'?object?.id:typeof object?.charge==='string'?object.charge:object?.charge?.id;
  if(typeof chargeId!=='string'||!/^ch_[a-zA-Z0-9]+$/.test(chargeId))return new Response(null,{status:400});
  try{const charge=await stripeRequest('/charges/'+chargeId);if(charge.livemode!==false||typeof charge.customer!=='string')throw Error('Invalid charge binding');await reconcileStripeCustomer(charge.customer);return Response.json({received:true});}catch{return new Response(null,{status:503});}
 }
 if(event.type==='checkout.session.completed'&&object?.mode==='setup'&&object.metadata?.reservation_policy==='medicea-next-access-v1'){
  if(!/^cs_test_[a-zA-Z0-9]+$/.test(object.id))return new Response(null,{status:400});
  try{await completeReservation(object.id);return Response.json({received:true});}catch{return new Response(null,{status:503});}
 }
 if(event.type.startsWith('invoice.')&&object?.metadata?.reservation_policy==='medicea-next-access-v1'){
  if(event.type!=='invoice.paid')return Response.json({received:true});
  if(!/^in_[a-zA-Z0-9]+$/.test(object.id))return new Response(null,{status:400});
  try{
   await billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${object.id}::text,1))::text AS result`;
    let invoice=await stripeRequest('/invoices/'+object.id);
    if(typeof invoice.customer!=='string')throw Error('Invalid customer');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${invoice.customer}::text,2))::text AS result`;
    invoice=await stripeRequest('/invoices/'+object.id);
    const access=reservedPassAccess(invoice),member=invoice.metadata?.member_id;
    access.active=access.active&&await purchaseSettled(invoice,'invoice');
    if(typeof member!=='string'||!/^[0-9a-f-]{36}$/i.test(member)||typeof invoice.customer!=='string')throw Error('Invalid reserved pass binding');
    const owners=await tx.$queryRaw<Array<{member_id:string}>>`SELECT member_id::text FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid AND customer_id=${invoice.customer}`;
    if(owners.length!==1)throw Error('Customer mismatch');
    await tx.$executeRaw`INSERT INTO medicea_billing.entitlement(provider,external_id,member_id,active,valid_until,customer_id) VALUES('stripe',${invoice.id},${member}::uuid,${access.active},${access.until},${invoice.customer}) ON CONFLICT(provider,external_id) DO NOTHING`;
   },{timeout:30000});return Response.json({received:true});
  }catch{return new Response(null,{status:503});}
 }
 if(event.type==='checkout.session.completed'&&object?.mode==='payment') {
  const sessionId=object.id;
  if(typeof sessionId!=='string'||!/^cs_test_[a-zA-Z0-9]+$/.test(sessionId))return new Response(null,{status:400});
  try {
   await billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}::text,1))::text AS result`;
    let session=await stripeRequest('/checkout/sessions/'+sessionId);
    if(typeof session.customer!=='string')throw Error('Invalid customer');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${session.customer}::text,2))::text AS result`;
    session=await stripeRequest('/checkout/sessions/'+sessionId);
    const items=await stripeRequest('/checkout/sessions/'+sessionId+'/line_items');
    const access=passAccess(session,items,event.created);
    access.active=access.active&&await purchaseSettled(session,'checkout');
    const member=session.metadata?.member_id;
    if(typeof member!=='string'||!/^[0-9a-f-]{36}$/i.test(member)||session.client_reference_id!==member||typeof session.customer!=='string')throw new Error('Invalid pass binding');
    const owners=await tx.$queryRaw<Array<{member_id:string}>>`SELECT member_id::text FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid AND customer_id=${session.customer}`;
    if(owners.length!==1)throw new Error('Customer mismatch');
    // Immutable purchase expiry: replay never restarts or extends the pass.
    await tx.$executeRaw`INSERT INTO medicea_billing.entitlement(provider,external_id,member_id,active,valid_until,customer_id) VALUES('stripe',${sessionId},${member}::uuid,${access.active},${access.until},${session.customer}) ON CONFLICT(provider,external_id) DO NOTHING`;
    await tx.$executeRaw`DELETE FROM medicea_billing.checkout WHERE member_id=${member}::uuid AND session_id=${sessionId}`;
   },{timeout:45000});
   return Response.json({received:true});
  }catch{return new Response(null,{status:503});}
 }
 const id=event.type.startsWith('customer.subscription.')?object?.id:event.type==='checkout.session.completed'?object?.subscription:object?.parent?.subscription_details?.subscription||object?.subscription;
 if(!id&&(event.type.startsWith('invoice.')||event.type==='checkout.session.completed'))return Response.json({received:true});
 if(typeof id!=='string'||!/^sub_[a-zA-Z0-9]+$/.test(id))return new Response(null,{status:400});
 try{
  await billingDb().$transaction(async tx=>{
   // Retrieve latest provider state under a subscription lock; old webhook order cannot restore expired access.
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}::text,1))::text AS result`;
   let subscription=await stripeRequest('/subscriptions/'+id);
   if(typeof subscription.customer!=='string')throw Error('Invalid customer');
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${subscription.customer}::text,2))::text AS result`;
   subscription=await stripeRequest('/subscriptions/'+id);
   const access=subscriptionAccess(subscription);
   access.active=access.active&&await purchaseSettled(subscription,'subscription');
   const member=subscription.metadata?.member_id;
   if(typeof member!=='string'||!/^[0-9a-f-]{36}$/i.test(member)||typeof subscription.customer!=='string')throw new Error('Invalid binding');
   const owners=await tx.$queryRaw<Array<{member_id:string}>>`SELECT member_id::text FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid AND customer_id=${subscription.customer}`;
   if(owners.length!==1)throw new Error('Customer mismatch');
   await tx.$executeRaw`INSERT INTO medicea_billing.entitlement(provider,external_id,member_id,active,valid_until,customer_id) VALUES('stripe',${id},${member}::uuid,${access.active},${access.until},${subscription.customer}) ON CONFLICT(provider,external_id) DO UPDATE SET active=excluded.active,valid_until=excluded.valid_until WHERE medicea_billing.entitlement.member_id=excluded.member_id AND medicea_billing.entitlement.customer_id=excluded.customer_id`;
   await tx.$executeRaw`DELETE FROM medicea_billing.checkout WHERE member_id=${member}::uuid`;
  },{timeout:30000});
  return Response.json({received:true});
 }catch{return new Response(null,{status:503});}
}
