import {isMembershipAdmin} from '@/lib/membership/complimentary';
import {membershipAccountEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {membershipStatus} from '@/lib/membership/store';
import {membershipPlans} from '@/lib/membership/active-plans';
export async function GET() {
 if(!membershipAccountEnabled())return new Response(null,{status:404});
 try {
  const user=await membershipUser();
  if(!user)return Response.json({signedIn:false},{headers:{'Cache-Control':'no-store'}});
  const status=await membershipStatus(user.id,user.email);
  // Billing management must remain available after a refund or payment failure.
  const details=await membershipPlans(user.id);
  const plans=(status.paidAccess??status.premium)?details:{activePlans:[],activePlayPlans:[],planSummaries:[],planDetailsUnavailable:false,canReserve:false,canManageStripe:details.canManageStripe,canManageGooglePlay:details.canManageGooglePlay};
  return Response.json({signedIn:true,email:user.email,homeCountry:user.homeCountry,canManageComplimentary:isMembershipAdmin(user),...status,...plans},{headers:{'Cache-Control':'no-store'}});
 } catch {return Response.json({error:'MEMBERSHIP_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
