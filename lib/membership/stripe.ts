import {createHmac,timingSafeEqual} from 'node:crypto';
import {stripeTestKey,PERSONAL_PLANS,isPersonalPlan,planAmount,isBillingCurrency,BILLING_CURRENCIES,type BillingCurrency,type PersonalPlan} from './config';
function safeStripeMessage(value:unknown){
 return typeof value==='string'?value.slice(0,600).replace(/\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9_]+/g,'[key]').replace(/\b(?:cus|sub|price|prod|bpc|cs|seti|pm)_[A-Za-z0-9_]+/g,'[id]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/https?:\/\/[^\s"']+/g,'[url]'):'';
}
export class StripeRequestError extends Error {
 constructor(public status:number,public code:string,public parameter:string,public detail:string){super('Stripe request unavailable');}
}
export function stripeDiagnostic(error:unknown){
 return error instanceof StripeRequestError?{status:error.status,code:error.code,parameter:error.parameter,detail:error.detail}:{status:0,code:'APP_VALIDATION_OR_STORAGE',parameter:'',detail:''};
}
export async function stripeRequest(path:string,params?:URLSearchParams,idempotencyKey?:string,timeoutMs=15000,apiVersion='2025-03-31.basil',query?:URLSearchParams) {
 if(!/^\/[a-z_]+(?:\/[a-zA-Z0-9_]+)*$/.test(path))throw new Error('Invalid Stripe path');
 if(params&&query)throw Error('Unexpected query on mutation');
 const response=await fetch('https://api.stripe.com/v1'+path+(query?'?'+query.toString():''),{method:params?'POST':'GET',headers:{Authorization:'Bearer '+stripeTestKey(),'Stripe-Version':apiVersion,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:params?.toString(),cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
 if(!response.ok){const body=await response.json().catch(()=>null),error=body?.error;throw new StripeRequestError(response.status,safeStripeMessage(error?.code||error?.type),safeStripeMessage(error?.param),safeStripeMessage(error?.message));}
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
export function planPriceId(plan:PersonalPlan,currency:BillingCurrency='GBP') {
 const names:Record<PersonalPlan,string>={pass7:'STRIPE_PERSONAL_7_DAY_PRICE_ID',pass14:'STRIPE_PERSONAL_14_DAY_PRICE_ID',pass30:'STRIPE_PERSONAL_30_DAY_PRICE_ID',monthly:'STRIPE_PERSONAL_MONTHLY_PRICE_ID',annual:'STRIPE_PERSONAL_ANNUAL_PRICE_ID'};
 const id=process.env[names[plan]+(currency==='GBP'?'':'_'+currency)];
 if(!id||!/^price_[a-zA-Z0-9]+$/.test(id))throw new Error('Test price missing');
 return id;
}
export function priceMatches(plan:PersonalPlan,price:any,currency:BillingCurrency='GBP') {
 const expected=PERSONAL_PLANS[plan];
 return price.livemode===false&&price.active===true&&price.currency===currency.toLowerCase()&&price.unit_amount===planAmount(plan,currency)&&(
  expected.kind==='subscription'?price.recurring?.interval===expected.interval&&price.recurring?.interval_count===1:price.recurring==null
 );
}
export async function validatePrice(plan:PersonalPlan,currency:BillingCurrency='GBP') {
 const price=await stripeRequest('/prices/'+planPriceId(plan,currency));
 if(!priceMatches(plan,price,currency))throw new Error('Test price does not match the personal plan');
 return price.id as string;
}
export function passAccess(session:any,items:any,eventTime:number,now=Date.now()) {
 const plan=session.metadata?.plan;
 if(!isPersonalPlan(plan)||PERSONAL_PLANS[plan].kind!=='pass')throw new Error('Invalid pass');
 const expected=PERSONAL_PLANS[plan];
 const currency=session.metadata?.currency ?? 'GBP';
 if(!isBillingCurrency(currency))throw new Error('Invalid pass currency');
 const lines=items.data;
 if(session.livemode!==false||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||!Number.isSafeInteger(eventTime)||eventTime>Math.floor(now/1000)+300||!Array.isArray(lines)||lines.length!==1||items.has_more||lines[0].quantity!==1||lines[0].price?.id!==planPriceId(plan,currency)||!priceMatches(plan,lines[0].price,currency)||session.currency!==currency.toLowerCase()||session.amount_total!==planAmount(plan,currency))throw new Error('Unexpected test pass payment');
 const until=new Date((eventTime+Number(expected.days)*86400)*1000);
 return {active:until.getTime()>now,until};
}
export function subscriptionPriceIds(plan:'monthly'|'annual') {
 return [...BILLING_CURRENCIES.flatMap(currency=>{try{return [planPriceId(plan,currency)];}catch{return [];}}),...(plan==='monthly'?[process.env.STRIPE_PERSONAL_MONTHLY_LEGACY_PRICE_ID]:[])].filter((id):id is string=>!!id);
}
export function subscriptionAccess(subscription:any,now=Date.now()) {
 const ids=[...subscriptionPriceIds('monthly'),...subscriptionPriceIds('annual')];
 const item=subscription.items?.data?.find((item:any)=>ids.includes(item.price?.id));
 const seconds=item?.current_period_end;
 if(subscription.livemode!==false||!item||!Number.isSafeInteger(seconds))throw new Error('Unexpected test subscription');
 const until=new Date(seconds*1000);
 return {active:subscription.status==='active'&&until.getTime()>now,until};
}
