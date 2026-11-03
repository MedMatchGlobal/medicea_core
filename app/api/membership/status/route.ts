import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {membershipStatus} from '@/lib/membership/store';
import {membershipPlans} from '@/lib/membership/active-plans';
export async function GET() {
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try {
  const user=await membershipUser();
  if(!user)return Response.json({signedIn:false},{headers:{'Cache-Control':'no-store'}});
  const status=await membershipStatus(user.id);
  const plans=status.premium?await membershipPlans(user.id):{activePlans:[],activePlayPlans:[],planDetailsUnavailable:false};
  return Response.json({signedIn:true,email:user.email,...status,...plans},{headers:{'Cache-Control':'no-store'}});
 } catch {return Response.json({error:'MEMBERSHIP_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
