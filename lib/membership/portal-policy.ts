import {type BillingCurrency,planAmount} from './config';
import {stripeRequest,planPriceId,priceMatches} from './stripe';

const policy = 'medicea-period-end-v2';
const conditions = ['decreasing_item_amount','shortening_interval'];
type Request = typeof stripeRequest;

export function safePortalPolicy(config:any,prices:string[]) {
  const update=config.features?.subscription_update;
  const cancel=config.features?.subscription_cancel;
  if(config.active!==true||config.livemode!==false||cancel?.enabled!==true||cancel.mode!=='at_period_end'||cancel.proration_behavior!=='none')return false;
  if(!prices.length)return update?.enabled===false;
  return update?.enabled===true && update.proration_behavior==='none'
    && update.default_allowed_updates?.length===1 && update.default_allowed_updates[0]==='price'
    && conditions.every(type=>update.schedule_at_period_end?.conditions?.some((condition:any)=>condition.type===type))
    && JSON.stringify(update.products?.flatMap((product:any)=>product.prices).sort())===JSON.stringify([...prices].sort());
}

export async function periodEndPortalConfiguration(currency:BillingCurrency|null,request:Request=stripeRequest) {
  // Both conditions are needed: annual is cheaper per unit of time, while monthly shortens the interval.
  const prices=currency?await Promise.all((['monthly','annual'] as const).map(async plan=>{
    const price=await request('/prices/'+planPriceId(plan,currency));
    if(!priceMatches(plan,price,currency)||typeof price.product!=='string'||!/^prod_[a-zA-Z0-9]+$/.test(price.product))throw Error('Invalid portal price');
    return price;
  })):[];
  if(currency&&planAmount('annual',currency)>=12*planAmount('monthly',currency))throw Error('Prices do not permit end-of-period switching');
  const ids=prices.map(price=>price.id);
  const signature=[policy,currency||'billing-only',...ids].join('-');
  const existing=await request('/billing_portal/configurations',undefined,undefined,15000,undefined,new URLSearchParams({'expand[0]':'data.features.subscription_update.products'}));
  const found=existing.data?.find((config:any)=>config.metadata?.medicea_policy===signature&&safePortalPolicy(config,ids));
  if(found)return found.id as string;
  const params=new URLSearchParams({
    'metadata[medicea_policy]':signature,
    'expand[0]':'features.subscription_update.products',
    'business_profile[headline]':'Manage your billing. Plan changes start after your current paid period; no charge now.',
    'features[customer_update][enabled]':'true',
    'features[customer_update][allowed_updates][0]':'address',
    'features[payment_method_update][enabled]':'true',
    'features[invoice_history][enabled]':'true',
    'features[subscription_cancel][enabled]':'true',
    'features[subscription_cancel][mode]':'at_period_end',
    'features[subscription_cancel][proration_behavior]':'none',
    'features[subscription_update][enabled]':String(!!currency),
  });
  if(currency){
    params.set('features[subscription_update][default_allowed_updates][0]','price');
    params.set('features[subscription_update][proration_behavior]','none');
    conditions.forEach((type,index)=>params.set(`features[subscription_update][schedule_at_period_end][conditions][${index}][type]`,type));
    const products=new Map<string,string[]>();
    for(const price of prices)products.set(price.product,[...(products.get(price.product)||[]),price.id]);
    [...products].forEach(([product,productPrices],index)=>{
      params.set(`features[subscription_update][products][${index}][product]`,product);
      productPrices.forEach((price,priceIndex)=>params.set(`features[subscription_update][products][${index}][prices][${priceIndex}]`,price));
    });
  }
  const created=await request('/billing_portal/configurations',params,signature);
  if(!/^bpc_[a-zA-Z0-9]+$/.test(created.id)||!safePortalPolicy(created,ids))throw Error('Unsafe portal policy');
  return created.id as string;
}
