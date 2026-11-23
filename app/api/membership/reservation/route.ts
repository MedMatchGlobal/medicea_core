import {membershipPreviewEnabled,sameOrigin,isPersonalPlan} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {homeCountryCurrency} from '@/lib/membership/home-country';
import {memberReservation,reserveCheckout,cancelReservation} from '@/lib/membership/future-access';
import {stripeDiagnostic} from '@/lib/membership/stripe';
export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(){
  if(!membershipPreviewEnabled())return new Response(null,{status:404});
  try{
    const user=await membershipUser();if(!user)return Response.json({reservation:null},{headers});
    return Response.json({reservation:await memberReservation(user.id)},{headers});
  }catch{return Response.json({error:'RESERVATION_UNAVAILABLE'},{status:503,headers});}
}
export async function POST(req:Request){
  if(!membershipPreviewEnabled())return new Response(null,{status:404});
  try{
    if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403,headers});
    const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401,headers});
    const body=await req.json();
    if(body?.action==='cancel'){await cancelReservation(user.id);return Response.json({cancelled:true},{headers});}
    if(!['quote','confirm'].includes(body?.action)||!isPersonalPlan(body?.plan))return Response.json({error:'INVALID_RESERVATION'},{status:400,headers});
    const currency=homeCountryCurrency(user.homeCountry,req.headers.get('x-vercel-ip-country'));
    if(body.currency!==currency)return Response.json({error:'CURRENCY_CHANGED'},{status:409,headers});
    if(body.action==='confirm'&&typeof body.startsAt!=='string')return Response.json({error:'CONFIRMATION_REQUIRED'},{status:400,headers});
    return Response.json(await reserveCheckout(user.id,body.plan,currency,body.action==='confirm'?body.startsAt:undefined),{headers});
  }catch(error){const diagnostic=stripeDiagnostic(error);console.error('Membership reservation checkout failed',diagnostic);return Response.json({error:'RESERVATION_UNAVAILABLE',diagnostic},{status:503,headers});}
}
