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
 return billingDb().$queryRaw<Array<{email:string;note:string;created_at:Date}>>`
 SELECT email,note,created_at FROM medicea_billing.complimentary_access WHERE active ORDER BY email`;
}
export async function changeComplimentary(actor:string,email:string,note:string,active:boolean){
 await billingDb().$transaction(async tx=>{
  await tx.$executeRaw`INSERT INTO medicea_billing.complimentary_access(email,note,active,updated_by)
   VALUES(${email},${note},${active},${actor}::uuid)
   ON CONFLICT(email) DO UPDATE SET note=excluded.note,active=excluded.active,updated_by=excluded.updated_by,updated_at=now()`;
  await tx.$executeRaw`INSERT INTO medicea_billing.complimentary_audit(actor_id,email,action,note)
   VALUES(${actor}::uuid,${email},${active?'grant':'revoke'},${note})`;
 });
}
