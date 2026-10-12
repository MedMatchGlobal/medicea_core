import {randomUUID} from 'node:crypto';
import {membershipPreviewEnabled, sameOrigin} from './config';
import {membershipUser} from './auth';
import {reserve,finish} from './store';
export async function meteredSearch(req: Request, run: (req:Request)=>Promise<Response>) {
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 let userId:string|undefined, id:string|undefined;
 try {
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();
  if(!user)return Response.json({error:'SIGN_IN_REQUIRED'},{status:401});
  userId=user.id; id=randomUUID();
  const reservation=await reserve(userId,id);
  if(!reservation.allowed)return Response.json({error:reservation.reason},{status:429});
  const result=await run(req);
  // 2xx responses with no actual result also release the reservation.
  const body=await result.clone().json().catch(()=>null);
  const composition=body?.originProfile?.active_ingredients;
  const validComposition=Array.isArray(composition)&&composition.some((item:any)=>typeof item?.name==='string'&&Boolean(item.name.trim())&&typeof item?.strength==='string'&&Boolean(item.strength.trim()));
  const successful=result.ok && validComposition && body && !body.error && typeof body.equivalentResults?.raw_text==='string' && Boolean(body.equivalentResults.raw_text.trim()) && body.equivalentResults.raw_text!=='No response.';
  await finish(userId,id,Boolean(successful)); id=undefined;
  return result;
 } catch {
  if(userId&&id)try{await finish(userId,id,false);}catch{/* no provider/customer data in logs */}
  return Response.json({error:'SEARCH_UNAVAILABLE'},{status:503});
 }
}
