import {membershipAccountEnabled,membershipOrigin,sameOrigin,isBillingCurrency,type BillingCurrency} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {billingDb} from '@/lib/membership/store';
import {stripeRequest,subscriptionAccess} from '@/lib/membership/stripe';
import {periodEndPortalConfiguration} from '@/lib/membership/portal-policy';
export const maxDuration=60;
export async function POST(req:Request){
 if(!membershipAccountEnabled())return new Response(null,{status:404});
 try{
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401});
  const customers=await billingDb().$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${user.id}::uuid`;
  if(!customers.length)return Response.json({error:'NO_SUBSCRIPTION'},{status:404});
  let currency:BillingCurrency|null=null;
  try{
   const subscriptions=await billingDb().$queryRaw<Array<{external_id:string}>>`SELECT external_id FROM medicea_billing.entitlement WHERE member_id=${user.id}::uuid AND provider='stripe' AND external_id LIKE 'sub_%' AND active AND valid_until>now() LIMIT 2`;
   if(subscriptions.length===1){
    const purchase=await stripeRequest('/subscriptions/'+subscriptions[0].external_id);
    if(purchase.id!==subscriptions[0].external_id||purchase.customer!==customers[0].customer_id||purchase.metadata?.member_id!==user.id||!subscriptionAccess(purchase).active)throw Error('Subscription mismatch');
    const code=(purchase.currency||purchase.items?.data?.[0]?.price?.currency)?.toUpperCase();if(isBillingCurrency(code))currency=code;
   }
  }catch{/* Billing and end-of-period cancellation remain available; ambiguous plans cannot be changed. */}
  const configuration=await periodEndPortalConfiguration(currency);
  const session=await stripeRequest('/billing_portal/sessions',new URLSearchParams({customer:customers[0].customer_id,configuration,return_url:membershipOrigin()+'/membership'}));
  const url=new URL(session.url);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw new Error('Unexpected portal');
  return Response.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'PORTAL_UNAVAILABLE'},{status:503});}
}
