import {membershipPreviewEnabled,sameOrigin} from './config';
import {membershipUser} from './auth';
import {consumeHelperBudget} from './helper-budget';

// Supporting translations are included tools, not additional medicine searches.
// Preserve the existing production boundary while securing the billing preview.
export async function helperAccess(req:Request,inputChars?:number):Promise<Response|null>{
 if(!membershipPreviewEnabled())return null;
 try{
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();
  if(!user)return Response.json({error:'SIGN_IN_REQUIRED',membershipAccess:true},{status:401});
  if(inputChars!==undefined){
   const budget=await consumeHelperBudget(user.id,inputChars);
   if(!budget.allowed)return Response.json({error:'TRANSLATION_RATE_LIMIT',retryAfter:budget.retryAfter},{status:429,headers:{'Retry-After':String(budget.retryAfter||60),'Cache-Control':'no-store'}});
  }
  return null;
 }catch{return Response.json({error:'SEARCH_UNAVAILABLE',membershipAccess:true},{status:503});}
}
