import {membershipUser} from '@/lib/membership/auth';
import {sameOrigin} from '@/lib/membership/config';
import {playEnabled,syncPlay} from '@/lib/membership/play';
import {PLAY_PLANS,playAccount,type PlayPlan} from '@/lib/membership/play-policy';
import {billingDb} from '@/lib/membership/store';
export const maxDuration=60;
export async function GET(){
 if(!playEnabled())return new Response(null,{status:404});
 try{const user=await membershipUser();if(!user)return new Response(null,{status:401});
 return Response.json({account:playAccount(user.id),plans:PLAY_PLANS},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'PLAY_UNAVAILABLE'},{status:503});}
}
export async function POST(req:Request){
 if(!playEnabled())return new Response(null,{status:404});
 try{
  if(!sameOrigin(req))return new Response(null,{status:403});
  const user=await membershipUser();if(!user)return new Response(null,{status:401});
  const text=await req.text();if(text.length>6000)return new Response(null,{status:413});
  const body=JSON.parse(text);
  if(body.restore===true){
   const purchases=await billingDb().$queryRaw<Array<{token:string;plan:PlayPlan}>>`SELECT token,plan FROM medicea_billing.play_purchase WHERE member_id=${user.id}::uuid AND NOT superseded AND NOT revoked ORDER BY verified_at LIMIT 10`;
   for(const p of purchases)await syncPlay(user.id,p.plan,p.token);
   return Response.json({restored:true},{headers:{'Cache-Control':'no-store'}});
  }
  if(!Object.prototype.hasOwnProperty.call(PLAY_PLANS,body.plan))return new Response(null,{status:400});
  return Response.json(await syncPlay(user.id,body.plan as PlayPlan,body.token),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'PLAY_VERIFICATION_UNAVAILABLE'},{status:503});}
}
