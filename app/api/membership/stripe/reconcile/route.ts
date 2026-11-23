import {timingSafeEqual} from 'node:crypto';
import {membershipPreviewEnabled} from '@/lib/membership/config';
import {backfillStripeEvents} from '@/lib/membership/stripe-backfill';
export const maxDuration=300;
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 const secret=process.env.MEDICEA_STRIPE_RECONCILE_SECRET,supplied=Buffer.from(req.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);
 if(!secret||secret.length<32||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return new Response(null,{status:401});
 try{return Response.json(await backfillStripeEvents(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'STRIPE_RECONCILIATION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
