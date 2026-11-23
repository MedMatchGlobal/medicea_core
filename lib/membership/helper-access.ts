import {membershipPreviewEnabled,sameOrigin} from './config';
import {membershipUser} from './auth';

// Supporting translations are included tools, not additional medicine searches.
// Preserve the existing production boundary while securing the billing preview.
export async function helperAccess(req:Request):Promise<Response|null>{
 if(!membershipPreviewEnabled())return null;
 try{
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  if(!await membershipUser())return Response.json({error:'SIGN_IN_REQUIRED',membershipAccess:true},{status:401});
  return null;
 }catch{return Response.json({error:'SEARCH_UNAVAILABLE',membershipAccess:true},{status:503});}
}
