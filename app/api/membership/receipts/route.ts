import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {memberReceipts} from '@/lib/membership/receipts';
export async function GET(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 const headers={'Cache-Control':'no-store'};
 try{
  const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401,headers});
  const after=new URL(req.url).searchParams.get('after')||undefined;
  if(after&&!/^ch_[a-zA-Z0-9]+$/.test(after))return Response.json({error:'INVALID_CURSOR'},{status:400,headers});
  return Response.json(await memberReceipts(user.id,after),{headers});
 }catch{return Response.json({error:'PAYMENTS_UNAVAILABLE'},{status:503,headers});}
}
