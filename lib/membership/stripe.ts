import {createHmac,timingSafeEqual} from 'node:crypto';
import {stripeTestKey,PERSONAL_PLANS,isPersonalPlan,type PersonalPlan} from './config';
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
export function planPriceId(plan:PersonalPlan) {
 const names:Record<PersonalPlan,string>={pass7:'STRIPE_PERSONAL_7_DAY_PRICE_ID',pass14:'STRIPE_PERSONAL_14_DAY_PRICE_ID',pass30:'STRIPE_PERSONAL_30_DAY_PRICE_ID',monthly:'STRIPE_PERSONAL_MONTHLY_PRICE_ID',annual:'STRIPE_PERSONAL_ANNUAL_PRICE_ID'};
 const id=process.env[names[plan]];
 if(!id||!/^price_[a-zA-Z0-9]+$/.test(id))throw new Error('Test price missing');
 return id;
}
export function priceMatches(plan:PersonalPlan,price:any) {
 const expected=PERSONAL_PLANS[plan];
 return price.livemode===false&&price.active===true&&price.currency==='gbp'&&price.unit_amount===expected.amountMinor&&(
  expected.kind==='subscription'?price.recurring?.interval===expected.interval&&price.recurring?.interval_count===1:price.recurring==null
 );
}
export async function validatePrice(plan:PersonalPlan) {
 const price=await stripeRequest('/prices/'+planPriceId(plan));
 if(!priceMatches(plan,price))throw new Error('Test price does not match the personal plan');
 return price.id as string;
}
export function passAccess(session:any,items:any,eventTime:number,now=Date.now()) {
 const plan=session.metadata?.plan;
 if(!isPersonalPlan(plan)||PERSONAL_PLANS[plan].kind!=='pass')throw new Error('Invalid pass');
 const expected=PERSONAL_PLANS[plan];
 const lines=items.data;
 if(session.livemode!==false||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||!Number.isSafeInteger(eventTime)||eventTime>Math.floor(now/1000)+300||!Array.isArray(lines)||lines.length!==1||items.has_more||lines[0].quantity!==1||lines[0].price?.id!==planPriceId(plan)||!priceMatches(plan,lines[0].price)||session.currency!=='gbp'||session.amount_total!==expected.amountMinor)throw new Error('Unexpected test pass payment');
 const until=new Date((eventTime+Number(expected.days)*86400)*1000);
 return {active:until.getTime()>now,until};
}
export function subscriptionAccess(subscription:any,now=Date.now()) {
 const ids=[process.env.STRIPE_PERSONAL_MONTHLY_PRICE_ID,process.env.STRIPE_PERSONAL_ANNUAL_PRICE_ID].filter(Boolean);
 const item=subscription.items?.data?.find((item:any)=>ids.includes(item.price?.id));
 const seconds=item?.current_period_end;
 if(subscription.livemode!==false||!item||!Number.isSafeInteger(seconds))throw new Error('Unexpected test subscription');
 const until=new Date(seconds*1000);
 return {active:subscription.status==='active'&&until.getTime()>now,until};
}
