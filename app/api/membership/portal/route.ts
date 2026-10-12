import {membershipPreviewEnabled,membershipOrigin,sameOrigin} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {billingDb} from '@/lib/membership/store';
import {stripeRequest} from '@/lib/membership/stripe';
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try{
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401});
  const customers=await billingDb().$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${user.id}::uuid`;
  if(!customers.length)return Response.json({error:'NO_SUBSCRIPTION'},{status:404});
  const session=await stripeRequest('/billing_portal/sessions',new URLSearchParams({customer:customers[0].customer_id,return_url:membershipOrigin()+'/membership'}));
  const url=new URL(session.url);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw new Error('Unexpected portal');
  return Response.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'PORTAL_UNAVAILABLE'},{status:503});}
}
