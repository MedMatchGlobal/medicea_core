import {createHmac,timingSafeEqual} from 'node:crypto';
import {stripeTestKey,PERSONAL_PLANS} from './config';
export async function stripeRequest(path:string,params?:URLSearchParams,idempotencyKey?:string) {
 if(!/^\/[a-z_]+(?:\/[a-zA-Z0-9_]+)*$/.test(path))throw new Error('Invalid Stripe path');
 const response=await fetch('https://api.stripe.com/v1'+path,{method:params?'POST':'GET',headers:{Authorization:'Bearer '+stripeTestKey(),'Stripe-Version':'2025-03-31.basil',...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:params?.toString(),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Stripe request unavailable');
 return response.json();
}
export function verifyStripeSignature(raw:string,header:string,secret:string,now=Math.floor(Date.now()/1000)) {
 if(!secret.startsWith('whsec_'))throw new Error('Webhook not configured');
 const parts=header.split(',').map(v=>v.split('='));
 const times=parts.filter(([k])=>k==='t');
 const timestamp=Number(times[0]?.[1]);
 if(times.length!==1||!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>300)throw new Error('Expired signature');
 const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest();
 if(!parts.some(([key,value])=>key==='v1'&&/^[0-9a-f]{64}$/.test(value||'')&&timingSafeEqual(expected,Buffer.from(value,'hex'))))throw new Error('Invalid signature');
 return JSON.parse(raw);
}
export function planPriceId(plan:'monthly'|'annual') {
 const id=process.env[plan==='monthly'?'STRIPE_PERSONAL_MONTHLY_PRICE_ID':'STRIPE_PERSONAL_ANNUAL_PRICE_ID'];
 if(!id||!/^price_[a-zA-Z0-9]+$/.test(id))throw new Error('Test price missing');
 return id;
}
export async function validatePrice(plan:'monthly'|'annual') {
 const price=await stripeRequest('/prices/'+planPriceId(plan));
 const expected=PERSONAL_PLANS[plan];
 if(price.livemode!==false||price.active!==true||price.currency!=='gbp'||price.unit_amount!==expected.amountMinor||price.recurring?.interval!==expected.interval||price.recurring?.interval_count!==1)throw new Error('Test price does not match the personal plan');
 return price.id as string;
}
export function subscriptionAccess(subscription:any,now=Date.now()) {
 const ids=[process.env.STRIPE_PERSONAL_MONTHLY_PRICE_ID,process.env.STRIPE_PERSONAL_ANNUAL_PRICE_ID].filter(Boolean);
 const item=subscription.items?.data?.find((item:any)=>ids.includes(item.price?.id));
 const seconds=item?.current_period_end;
 if(subscription.livemode!==false||!item||!Number.isSafeInteger(seconds))throw new Error('Unexpected test subscription');
 const until=new Date(seconds*1000);
 return {active:subscription.status==='active'&&until.getTime()>now,until};
}
