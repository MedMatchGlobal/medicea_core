export class ConsoleError extends Error {constructor(public code:string,public status=400){super(code);}}
export function enabled(){return process.env.MEDICEA_CONSOLE_SANDBOX==='true'&&process.env.VERCEL_ENV!=='production';}
export function assertEnabled(){if(!enabled())throw new ConsoleError('CONSOLE_DISABLED',404);}
export function sameOrigin(req:Request){
 const expected=process.env.MEDICEA_CONSOLE_ORIGIN;
 if(!expected||req.headers.get('origin')!==expected||new URL(req.url).origin!==expected)throw new ConsoleError('INVALID_ORIGIN',403);
}
export function ownerIdentity(user:{id:string;email?:string;email_confirmed_at?:string|null}|null){
 const owner=process.env.MEDICEA_CONSOLE_OWNER_EMAIL?.trim().toLowerCase();
 if(!owner||!user?.email_confirmed_at||user.email?.toLowerCase()!==owner)throw new ConsoleError('OWNER_REQUIRED',403);
 return user;
}
export function requireMfa(claims:any,user:{id:string}){
 const now=Math.floor(Date.now()/1000);
 if(claims?.sub!==user.id||claims.aal!=='aal2'||!Number.isFinite(claims.exp)||claims.exp<=now)throw new ConsoleError('MFA_REQUIRED',403);
 const last=Array.isArray(claims.amr)?Math.max(0,...claims.amr.filter((a:any)=>a.method==='totp'&&Number.isSafeInteger(a.timestamp)).map((a:any)=>a.timestamp)):0;
 if(last>now+30||now-last>900)throw new ConsoleError('RECENT_MFA_REQUIRED',403);
}
export function memberId(value:unknown){if(typeof value!=='string'||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value))throw new ConsoleError('INVALID_ACCOUNT');return value;}
export function operationInput(body:any){
 const id=memberId(body?.operationId),member=memberId(body?.member);
 if(!['refund','payment_request'].includes(body?.action)||!Number.isSafeInteger(body.amountMinor)||body.amountMinor<=0||body.amountMinor>1000000)throw new ConsoleError('INVALID_AMOUNT');
 if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500||body.confirmed!==true)throw new ConsoleError('CONFIRMATION_REQUIRED');
 if(!['GBP','EUR','USD'].includes(body.currency))throw new ConsoleError('INVALID_CURRENCY');
 if(body.action==='refund'&&(typeof body.charge!=='string'||!/^ch_[A-Za-z0-9]+$/.test(body.charge)))throw new ConsoleError('INVALID_PURCHASE');
 if(body.action==='payment_request'&&(typeof body.description!=='string'||!body.description.trim()||body.description.length>180))throw new ConsoleError('INVALID_DESCRIPTION');
 return {id,member,action:body.action as 'refund'|'payment_request',amountMinor:body.amountMinor as number,currency:body.currency as string,reason:body.reason.trim(),charge:body.action==='refund'?body.charge as string:null,description:body.action==='payment_request'?body.description.trim():null};
}
export function moneyMinor(value:string){
 if(!/^(?:0|[1-9][0-9]{0,4})(?:\.[0-9]{1,2})?$/.test(value))throw new ConsoleError('INVALID_AMOUNT');
 const [whole,fraction='']=value.split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(amount<=0||amount>1000000)throw new ConsoleError('INVALID_AMOUNT');return amount;
}
