import {membershipPreviewEnabled} from '@/lib/membership/config';
import {membershipUser} from '@/lib/membership/auth';
import {billingDb} from '@/lib/membership/store';
export async function GET(req:Request){
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 try{
  const user=await membershipUser();if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401,headers});
  const query=new URL(req.url).searchParams,id=query.get('id'),after=query.get('after');
  for(const value of [id,after])if(value&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value))return Response.json({error:'INVALID_CONFIRMATION'},{status:400,headers});
  if(id){
   const rows=await billingDb().$queryRaw<Array<{body:string}>>`SELECT body FROM medicea_billing.purchase_confirmation WHERE id=${id}::uuid AND member_id=${user.id}::uuid`;
   if(rows.length!==1)return new Response(null,{status:404,headers});
   return new Response(rows[0].body,{headers:{...headers,'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="medicea-confirmation-${id}.txt"`}});
  }
  const rows=await billingDb().$queryRaw<Array<{id:string;created_at:Date;kind:string;plan:string}>>`SELECT id::text,created_at,snapshot->>'kind' AS kind,snapshot->>'plan' AS plan FROM medicea_billing.purchase_confirmation WHERE member_id=${user.id}::uuid AND (${after}::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM medicea_billing.purchase_confirmation WHERE id=${after}::uuid AND member_id=${user.id}::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`;
  return Response.json({confirmations:rows.slice(0,50),next:rows.length>50?rows[49].id:null},{headers});
 }catch{return Response.json({error:'CONFIRMATIONS_UNAVAILABLE'},{status:503,headers});}
}
