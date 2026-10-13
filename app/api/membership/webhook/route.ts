import {membershipPreviewEnabled} from '@/lib/membership/config';
import {billingDb} from '@/lib/membership/store';
import {verifyStripeSignature,stripeRequest,subscriptionAccess,passAccess} from '@/lib/membership/stripe';
export const maxDuration=60;
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 let event:any;
 try{const raw=await req.text();if(raw.length>1000000)return new Response(null,{status:413});event=verifyStripeSignature(raw,req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET||'');}catch{return new Response(null,{status:400});}
 if(event.livemode!==false)return new Response(null,{status:400});
 if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','checkout.session.completed','invoice.paid','invoice.payment_failed'].includes(event.type))return Response.json({received:true});
 const object=event.data?.object;
 if(event.type==='checkout.session.completed'&&object?.mode==='payment') {
  const sessionId=object.id;
  if(typeof sessionId!=='string'||!/^cs_test_[a-zA-Z0-9]+$/.test(sessionId))return new Response(null,{status:400});
  try {
   await billingDb().$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}::text,1))`;
    const session=await stripeRequest('/checkout/sessions/'+sessionId);
    const items=await stripeRequest('/checkout/sessions/'+sessionId+'/line_items');
    const access=passAccess(session,items,event.created);
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
 const id=event.type.startsWith('customer.subscription.')?object?.id:event.type==='checkout.session.completed'?object?.subscription:object?.parent?.subscription_details?.subscription;
 if(typeof id!=='string'||!/^sub_[a-zA-Z0-9]+$/.test(id))return new Response(null,{status:400});
 try{
  await billingDb().$transaction(async tx=>{
   // Retrieve latest provider state under a subscription lock; old webhook order cannot restore expired access.
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}::text,1))`;
   const subscription=await stripeRequest('/subscriptions/'+id);
   const access=subscriptionAccess(subscription);
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
