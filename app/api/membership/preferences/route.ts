import {membershipAccountEnabled,sameOrigin} from '@/lib/membership/config';
import {membershipAuth,membershipUser} from '@/lib/membership/auth';
import {validHomeCountry} from '@/lib/membership/home-country';

const headers = {'Cache-Control':'no-store'};

export async function GET() {
  if (!membershipAccountEnabled()) return new Response(null,{status:404});
  try {
    const user = await membershipUser();
    if (!user) return Response.json({error:'SIGN_IN_REQUIRED'},{status:401,headers});
    return Response.json({homeCountry:user.homeCountry},{headers});
  } catch {return Response.json({error:'PREFERENCES_UNAVAILABLE'},{status:503,headers});}
}

export async function POST(req:Request) {
  if (!membershipAccountEnabled()) return new Response(null,{status:404});
  if (!sameOrigin(req)) return Response.json({error:'INVALID_ORIGIN'},{status:403,headers});
  try {
    const user = await membershipUser();
    if (!user) return Response.json({error:'SIGN_IN_REQUIRED'},{status:401,headers});
    const body = await req.json().catch(()=>null);
    const homeCountry = validHomeCountry(body?.homeCountry);
    if (!homeCountry) return Response.json({error:'INVALID_HOME_COUNTRY'},{status:400,headers});
    const client = await membershipAuth();
    // Supabase merges this preference into the current user's metadata.
    const {data,error} = await client.auth.updateUser({data:{medicea_home_country:homeCountry}});
    if (error || data.user?.id !== user.id || data.user.user_metadata?.medicea_home_country !== homeCountry) throw Error('Preference update failed');
    return Response.json({homeCountry},{headers});
  } catch {return Response.json({error:'PREFERENCES_UNAVAILABLE'},{status:503,headers});}
}
