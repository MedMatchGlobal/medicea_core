import {membershipPreviewEnabled} from '@/lib/membership/config';
import {billingDb} from '@/lib/membership/store';
import {verifyStripeSignature,stripeRequest,subscriptionAccess} from '@/lib/membership/stripe';
export const maxDuration=60;
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 let event:any;
 try{const raw=await req.text();if(raw.length>1000000)return new Response(null,{status:413});event=verifyStripeSignature(raw,req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET||'');}catch{return new Response(null,{status:400});}
 if(event.livemode!==false)return new Response(null,{status:400});
 if(!['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','checkout.session.completed','invoice.paid','invoice.payment_failed'].includes(event.type))return Response.json({received:true});
 const object=event.data?.object;
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
