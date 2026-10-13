import {membershipPreviewEnabled,sameOrigin} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {membershipStatus} from '@/lib/membership/store';
// A UX preflight only. Every generation endpoint still reserves server-side.
export async function POST(req:Request) {
 if(!membershipPreviewEnabled())return Response.json({enabled:false});
 const reply=(error:string,status:number)=>Response.json({error,membershipAccess:true},{status,headers:{'Cache-Control':'no-store'}});
 try {
  if(!sameOrigin(req))return reply('INVALID_ORIGIN',403);
  const user=await membershipUser();if(!user)return reply('SIGN_IN_REQUIRED',401);
  const s=await membershipStatus(user.id);
  if(s.reserved>=3)return reply('TOO_MANY_CONCURRENT_REQUESTS',429);
  if(s.premium)return Response.json({allowed:true});
  if(s.trialAvailable&&s.trialUsed+(s.trialReserved||0)<s.trialLimit)return Response.json({allowed:true});
  if(s.trialAvailable&&(s.trialReserved||0)>0)return reply('TRIAL_REQUESTS_PENDING',429);
  if(s.used+(s.freeReserved||0)<s.limit)return Response.json({allowed:true});
  return reply('MONTHLY_LIMIT',429);
 }catch{return reply('SEARCH_UNAVAILABLE',503);}
}
