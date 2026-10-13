export const ACCESS_EVENT='medicea:membership-access';
export const SAVE_DRAFT_EVENT='medicea:save-search-draft';
export const RETURN_KEY='medicea.membership-return';
export class MembershipAccessError extends Error {constructor(public reason:string){super(reason);}}
export async function membershipFetch(input:RequestInfo|URL,init?:RequestInit) {
 const response=await fetch(input,init);
 if(!response.ok) {
  const body=await response.clone().json().catch(()=>null);
  if(body?.membershipAccess===true) {
   window.dispatchEvent(new CustomEvent(ACCESS_EVENT,{detail:{reason:body.error}}));
   throw new MembershipAccessError(body.error);
  }
 }
 return response;
}
export async function checkMembershipAccess(enabled:boolean) {
 if(!enabled)return;
 try {
  const response=await membershipFetch('/api/membership/access',{method:'POST'});
  if(!response.ok)throw Error('Access check unavailable');
 }catch(error) {
  if(error instanceof MembershipAccessError)throw error;
  window.dispatchEvent(new CustomEvent(ACCESS_EVENT,{detail:{reason:'SEARCH_UNAVAILABLE'}}));
  throw new MembershipAccessError('SEARCH_UNAVAILABLE');
 }
}
export function membershipReturnHref(value:unknown) {
 return value==='/pets'?'/pets?resume=1':value==='/'?'/?resume=1':null;
}
export function rememberSearchReturn() {
 window.dispatchEvent(new Event(SAVE_DRAFT_EVENT));
 try {sessionStorage.setItem(RETURN_KEY,window.location.pathname==='/pets'?'/pets':'/');}catch{}
}
export function storeSearchDraft(key:string,value:unknown) {
 try {sessionStorage.setItem(key,JSON.stringify(value));}catch{/* The form remains intact on browser Back. */}
}
export function takeSearchDraft(key:string):any {
 try {const value=sessionStorage.getItem(key);sessionStorage.removeItem(key);return value?JSON.parse(value):null;}catch{return null;}
}
