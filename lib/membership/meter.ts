import {randomUUID} from 'node:crypto';
import {membershipPreviewEnabled, sameOrigin} from './config';
import {membershipUser} from './auth';
import {reserve,finish} from './store';
import {AsyncLocalStorage} from 'node:async_hooks';
import {successfulSearch,type SearchKind} from './search-result';
import {allowsSearchFollowup,issueSearchGrant,searchGrantConfigured} from './search-grant';
// Only server code can share an authorised reservation across a compound search.
// Request headers and client-supplied flags never bypass access checks.
const authorisedSearch=new AsyncLocalStorage<boolean>();
export function withMembership<T extends Request>(run:(req:T)=>Promise<Response>,kind:SearchKind,grantMode?:string) {
 return async (req:T)=>{
  if(!membershipPreviewEnabled()||authorisedSearch.getStore())return run(req);
  if(kind==='leaflet'||kind==='information') {
   const input=await req.clone().json().catch(()=>null);
   if(input?.searchAccess) {
    try {
     if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
     const user=await membershipUser();
     if(!user)return Response.json({error:'SIGN_IN_REQUIRED',membershipAccess:true},{status:401});
     if(!allowsSearchFollowup(input.searchAccess,user.id,kind,input))return Response.json({error:'SEARCH_ACCESS_INVALID',membershipAccess:true},{status:403});
     return authorisedSearch.run(true,()=>run(req));
    }catch{return Response.json({error:'SEARCH_UNAVAILABLE',membershipAccess:true},{status:503});}
   }
  }
  return meteredSearch(req,request=>run(request as T),kind,grantMode);
 };
}
export async function meteredSearch(req: Request, run: (req:Request)=>Promise<Response>,kind:SearchKind='matches',grantMode?:string) {
 if(!membershipPreviewEnabled())return new Response(null,{status:404});
 let userId:string|undefined, id:string|undefined;
 try {
  if(!sameOrigin(req))return Response.json({error:'INVALID_ORIGIN'},{status:403});
  const user=await membershipUser();
  if(!user)return Response.json({error:'SIGN_IN_REQUIRED',membershipAccess:true},{status:401});
  let input=kind==='matches'?await req.clone().json().catch(()=>null):null;
  if(input&&grantMode)input={...input,mode:grantMode};
  if(kind==='matches')searchGrantConfigured();
  userId=user.id; id=randomUUID();
  const reservation=await reserve(userId,id);
  if(!reservation.allowed)return Response.json({error:reservation.reason,membershipAccess:true},{status:429});
  const result=await authorisedSearch.run(true,()=>run(req));
  // 2xx responses with no actual result also release the reservation.
  const text=await result.clone().text();
  let body;try{body=JSON.parse(text);}catch{body=text;}
  const successful=result.ok&&successfulSearch(kind,body);
  await finish(userId,id,Boolean(successful)); id=undefined;
  if(successful&&kind==='matches'&&input) {
   return Response.json({...body,searchAccess:issueSearchGrant(userId,input,body)},{status:result.status});
  }
  return result;
 } catch {
  if(userId&&id)try{await finish(userId,id,false);}catch{/* no provider/customer data in logs */}
  return Response.json({error:'SEARCH_UNAVAILABLE',membershipAccess:true},{status:503});
 }
}
