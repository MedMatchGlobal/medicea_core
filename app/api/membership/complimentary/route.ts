import {membershipPreviewEnabled,sameOrigin} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {isMembershipAdmin,normaliseAccessEmail,listComplimentary,changeComplimentary} from '@/lib/membership/complimentary';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try{const user=await membershipUser();if(!isMembershipAdmin(user))return reply({error:'OWNER_ONLY'},403);
  return reply({people:await listComplimentary()});
 }catch{return reply({error:'ACCESS_UNAVAILABLE'},503);}
}
export async function POST(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 try{
  if(!sameOrigin(req))return reply({error:'INVALID_ORIGIN'},403);
  const user=await membershipUser();if(!user||!isMembershipAdmin(user))return reply({error:'OWNER_ONLY'},403);
  const raw=await req.text();if(raw.length>2000)return reply({error:'INVALID_INPUT'},400);
  const body=JSON.parse(raw),email=normaliseAccessEmail(body.email);
  if(!email||!['grant','revoke'].includes(body.action)||typeof body.note!=='string'||body.note.length>200)return reply({error:'INVALID_INPUT'},400);
  await changeComplimentary(user.id,email,body.note.trim(),body.action==='grant');
  return reply({saved:true});
 }catch{return reply({error:'ACCESS_UNAVAILABLE'},503);}
}
