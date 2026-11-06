import {createHmac} from 'node:crypto';
import {PLAY_PLANS,type PlayPlan} from './play-catalogue';
export {PLAY_PACKAGE,PLAY_PLANS,type PlayPlan} from './play-catalogue';
export function playAccount(member:string){
 const secret=process.env.GOOGLE_PLAY_ACCOUNT_SECRET;
 if(!secret||secret.length<32)throw Error('Play account secret missing');
 return createHmac('sha256',secret).update('medicea-play-v1:'+member).digest('hex');
}
export function playToken(value:unknown):string{
 if(typeof value!=='string'||value.length<10||value.length>4096||/[\s\x00-\x1f]/.test(value))throw Error('Invalid token');
 return value;
}
export function playAccess(plan:PlayPlan,p:any,account:string,now=Date.now()){
 const spec=PLAY_PLANS[plan];if(!spec)throw Error('Unknown plan');
 // Preview accepts licence-test purchases only, even if real credentials exist.
 if(spec.type==='inapp'){
  if(!p||p.purchaseType!==0||p.obfuscatedExternalAccountId!==account||(p.quantity??1)!==1)throw Error('Purchase mismatch');
  const start=Number(p.purchaseTimeMillis);
  if(!Number.isFinite(start)||start<=0||start>now+60000)throw Error('Invalid purchase time');
  const until=new Date(start+spec.days*86400000);
  return {active:p.purchaseState===0&&until.getTime()>now,until,linked:null as string|null,
   fulfill:p.purchaseState===0&&p.consumptionState===0?'consume':null};
 }
 if(!p?.testPurchase||p.externalAccountIdentifiers?.obfuscatedExternalAccountId!==account)throw Error('Purchase mismatch');
 const lines=p.lineItems;
 if(!Array.isArray(lines)||lines.length!==1)throw Error('Unexpected subscription items');
 const line=lines[0];
 if(line.productId!==spec.product||line.offerDetails?.basePlanId!==spec.basePlan||!line.autoRenewingPlan)throw Error('Wrong subscription plan');
 const until=new Date(line.expiryTime);
 if(!Number.isFinite(until.getTime()))throw Error('Missing expiry');
 const active=['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'].includes(p.subscriptionState)&&until.getTime()>now;
 return {active,until,linked:p.linkedPurchaseToken?playToken(p.linkedPurchaseToken):null,
  fulfill:active&&p.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING'?'acknowledge':null};
}
