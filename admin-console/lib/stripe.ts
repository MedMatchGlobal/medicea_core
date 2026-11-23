import {ConsoleError,assertEnabled} from './policy';
export function testKeyConfigured(){return /^(sk|rk)_test_[A-Za-z0-9]+$/.test(process.env.MEDICEA_CONSOLE_STRIPE_KEY||'');}
export async function stripe(path:string,params?:URLSearchParams,idempotencyKey?:string,query?:URLSearchParams):Promise<any>{
 assertEnabled();const key=process.env.MEDICEA_CONSOLE_STRIPE_KEY||'';
 if(!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key)||!/^\/[a-z_]+(?:\/[a-zA-Z0-9_]+)*$/.test(path))throw new ConsoleError('STRIPE_UNAVAILABLE',503);
 const response=await fetch('https://api.stripe.com/v1'+path+(query?'?'+query:''),{method:params?'POST':'GET',headers:{Authorization:'Bearer '+key,'Stripe-Version':'2026-11-18.endive',...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:params?.toString(),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new ConsoleError(response.status===401?'STRIPE_AUTHENTICATION_FAILED':response.status===403?'STRIPE_PERMISSION_REQUIRED':response.status===404?'STRIPE_RESOURCE_NOT_FOUND':'PROVIDER_REQUEST_FAILED',502);
 const value=await response.json();if(value.livemode===true)throw new ConsoleError('LIVE_DATA_REJECTED',502);return value;
}
export function paymentUrl(value:unknown){if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='checkout.stripe.com'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
