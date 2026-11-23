import {membershipPreviewEnabled} from '@/lib/membership/config';
import {verifyStripeSignature} from '@/lib/membership/stripe';
import {processStripeEvent} from '@/lib/membership/stripe-events';
export const maxDuration=60;
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 let event:any;
 try{const raw=await req.text();if(raw.length>1000000)return new Response(null,{status:413});event=verifyStripeSignature(raw,req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET||'');}catch{return new Response(null,{status:400});}
 return processStripeEvent(event);
}
