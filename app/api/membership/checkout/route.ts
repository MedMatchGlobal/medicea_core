import {membershipPreviewEnabled,membershipOrigin,sameOrigin,isPersonalPlan,PERSONAL_PLANS} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {billingDb,membershipStatus} from '@/lib/membership/store';
import {stripeRequest,validatePrice} from '@/lib/membership/stripe';
export const maxDuration=60;
export async function POST(req:Request) {
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try {
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401});
  if((await membershipStatus(user.id)).premium)return Response.json({error:'ALREADY_SUBSCRIBED'},{status:409});
  const body=await req.json();const requestedPlan:unknown=body?.plan;if(!isPersonalPlan(requestedPlan))return Response.json({error:'INVALID_PLAN'},{status:400});
  const plan=requestedPlan;
  const price=await validatePrice(plan);
  const url=await billingDb().$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id}::text,0))::text AS result`;
   const active=await tx.$queryRaw<Array<{url:string;plan:string}>>`SELECT url,plan FROM medicea_billing.checkout WHERE member_id=${user.id}::uuid AND expires_at>now()`;
   if(active.length){if(active[0].plan!==plan)throw new Error('Checkout already in progress');return active[0].url;}
   let customers=await tx.$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${user.id}::uuid`;
   if(!customers.length){
    const params=new URLSearchParams({'metadata[member_id]':user.id});if(user.email)params.set('email',user.email);
    const customer=await stripeRequest('/customers',params,'member-customer-'+user.id);
    if(customer.livemode!==false||!/^cus_[a-zA-Z0-9]+$/.test(customer.id))throw new Error('Unexpected customer');
    await tx.$executeRaw`INSERT INTO medicea_billing.stripe_customer(member_id,customer_id) VALUES(${user.id}::uuid,${customer.id})`;
    customers=[{customer_id:customer.id}];
   }
   const origin=membershipOrigin();
   const bucket=Math.floor(Date.now()/1800000);
   const params=new URLSearchParams({mode:PERSONAL_PLANS[plan].kind==='pass'?'payment':'subscription',customer:customers[0].customer_id,'line_items[0][price]':price,'line_items[0][quantity]':'1',client_reference_id:user.id,'metadata[member_id]':user.id,'metadata[plan]':plan,'payment_method_types[0]':'card',success_url:origin+'/membership?checkout=returned',cancel_url:origin+'/membership?checkout=cancelled',expires_at:String((bucket+2)*1800)});
   if(PERSONAL_PLANS[plan].kind==='subscription')params.set('subscription_data[metadata][member_id]',user.id);
   const session=await stripeRequest('/checkout/sessions',params,'checkout-'+user.id+'-'+plan+'-'+bucket);
   const checkout=new URL(session.url);
   if(session.livemode!==false||checkout.protocol!=='https:'||checkout.hostname!=='checkout.stripe.com')throw new Error('Unexpected checkout');
   await tx.$executeRaw`INSERT INTO medicea_billing.checkout(member_id,session_id,plan,url,expires_at) VALUES(${user.id}::uuid,${session.id},${plan},${session.url},${new Date(session.expires_at*1000)}) ON CONFLICT(member_id) DO UPDATE SET session_id=excluded.session_id,plan=excluded.plan,url=excluded.url,expires_at=excluded.expires_at`;
   return session.url;
  },{timeout:60000});
  return Response.json({url},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'TEST_CHECKOUT_UNAVAILABLE'},{status:503});}
}
