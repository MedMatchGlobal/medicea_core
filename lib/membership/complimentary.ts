import type {AccessPolicy,ModulePermission} from './access-policy';
import {billingDb} from './store';

export function normaliseAccessEmail(value:unknown):string|null {
 if(typeof value!=='string')return null;
 const email=value.trim().toLowerCase();
 return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;
}
// Identity comes from Supabase getUser(), never request data or user metadata.
export function isMembershipAdmin(user:{email?:string}|null){
 const owner=normaliseAccessEmail(process.env.MEDICEA_MEMBERSHIP_ADMIN_EMAIL);
 return !!owner&&!!user&&normaliseAccessEmail(user.email)===owner;
}
export async function listComplimentary(){
 return billingDb().$queryRaw<Array<{email:string;note:string;full_access:boolean;permissions:ModulePermission[]}>>`
 SELECT a.email,a.note,a.full_access,COALESCE((SELECT jsonb_agg(jsonb_build_object('module',p.module,'monthlyLimit',p.monthly_limit,'expiresAt',p.expires_at) ORDER BY p.module) FROM medicea_billing.complimentary_permission p WHERE p.email=a.email),'[]'::jsonb) AS permissions
 FROM medicea_billing.complimentary_access a WHERE a.active ORDER BY a.email`;
}
export async function changeComplimentary(actor:string,email:string,note:string,active:boolean,policy:AccessPolicy={mode:'full',permissions:[]}){
 await billingDb().$transaction(async tx=>{
  if(active){
   await tx.$executeRaw`INSERT INTO medicea_billing.complimentary_access(email,note,active,full_access,updated_by)
    VALUES(${email},${note},true,${policy.mode==='full'},${actor}::uuid)
    ON CONFLICT(email) DO UPDATE SET note=excluded.note,active=true,full_access=excluded.full_access,updated_by=excluded.updated_by,updated_at=now()`;
   await tx.$executeRaw`DELETE FROM medicea_billing.complimentary_permission WHERE email=${email}`;
   for(const p of policy.permissions)await tx.$executeRaw`INSERT INTO medicea_billing.complimentary_permission(email,module,monthly_limit,expires_at) VALUES(${email},${p.module},${p.monthlyLimit},${p.expiresAt}::timestamptz)`;
  }else await tx.$executeRaw`UPDATE medicea_billing.complimentary_access SET active=false,updated_by=${actor}::uuid,updated_at=now() WHERE email=${email}`;
  await tx.$executeRaw`INSERT INTO medicea_billing.complimentary_audit(actor_id,email,action,note,policy)
   VALUES(${actor}::uuid,${email},${active?'grant':'revoke'},${note},${active?JSON.stringify(policy):null}::jsonb)`;
 });
}
