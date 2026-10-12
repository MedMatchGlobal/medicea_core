import {membershipPreviewEnabled, sameOrigin} from '@/lib/membership/config';
import {membershipAuth} from '@/lib/membership/auth';
export async function POST(req: Request) {
 if (!membershipPreviewEnabled()) return new Response(null,{status:404});
 try {
  if (!sameOrigin(req)) return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const body=await req.json();
  const client=await membershipAuth();
  if(body.action==='signout') {const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;return Response.json({ok:true});}
  if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)) return Response.json({error:'INVALID_EMAIL'},{status:400});
  if(body.action==='send') {
   const {error}=await client.auth.signInWithOtp({email:body.email});
   if(error)return Response.json({error:'CODE_REQUEST_UNAVAILABLE'},{status:429});
   return Response.json({ok:true});
  }
  if(body.action==='verify'&&typeof body.code==='string'&&/^\d{6,8}$/.test(body.code)) {
   const {error}=await client.auth.verifyOtp({email:body.email,token:body.code,type:'email'});
   if(error)return Response.json({error:'INVALID_CODE'},{status:401});
   return Response.json({ok:true});
  }
  return Response.json({error:'INVALID_REQUEST'},{status:400});
 } catch {return Response.json({error:'AUTH_UNAVAILABLE'},{status:503});}
}
