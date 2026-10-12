import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {membershipStatus} from '@/lib/membership/store';
export async function GET() {
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try {
  const user=await membershipUser();
  if(!user)return Response.json({signedIn:false},{headers:{'Cache-Control':'no-store'}});
  return Response.json({signedIn:true,email:user.email,...await membershipStatus(user.id)},{headers:{'Cache-Control':'no-store'}});
 } catch {return Response.json({error:'MEMBERSHIP_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
