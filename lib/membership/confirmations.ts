import {billingDb} from './store';
import {membershipPreviewEnabled,PERSONAL_PLANS,isPersonalPlan,isBillingCurrency,planAmount,type PersonalPlan} from './config';
import {stripeRequest,planPriceId} from './stripe';
import {confirmationText,type Confirmation} from './confirmation-text';
import {confirmationMailTransport} from './confirmation-mail';
export function confirmationsEnabled(){return membershipPreviewEnabled()&&process.env.MEDICEA_CONFIRMATIONS_PREVIEW==='true';}
export async function queueStripeConfirmation(event:any){
 if(!confirmationsEnabled())return;
 const cutoff=Number(process.env.MEDICEA_CONFIRMATIONS_FROM_EPOCH);
 if(!Number.isSafeInteger(cutoff)||cutoff<1795392000)throw Error('CONFIRMATION_CUTOVER_REQUIRED');
 if(event.livemode!==false||!Number.isSafeInteger(event.created)||event.created<cutoff)return;
 const original=event.data?.object;if(!original||!['checkout.session.completed','invoice.paid'].includes(event.type)||original.metadata?.console_policy==='customer-approved-payment-request-v1')return;
 let source:any,member:string,customer:string,value:Confirmation;
 const base={version:'2026-11-23' as const,issuedAt:new Date(event.created*1000).toISOString()};
 if(event.type==='checkout.session.completed'){
  if(!/^cs_test_[A-Za-z0-9]+$/.test(original.id))throw Error('INVALID_CONFIRMATION_SOURCE');
  source=await stripeRequest('/checkout/sessions/'+original.id);member=source.metadata?.member_id;customer=source.customer;
  if(source.mode==='subscription')return; // Invoice paid creates one document, avoiding duplicate checkout/invoice emails.
  if(source.livemode!==false||source.status!=='complete'||source.client_reference_id!==member||!isPersonalPlan(source.metadata?.plan))throw Error('INVALID_CONFIRMATION_SOURCE');
  const plan=source.metadata.plan as PersonalPlan;
  if(source.mode==='setup'){
   if(source.metadata.reservation_policy!=='medicea-next-access-v1'||source.metadata.reservation_processed!=='true'||!isBillingCurrency(source.metadata.currency))throw Error('UNVERIFIED_UPGRADE_CONFIRMATION');
   const start=Number(source.metadata.reservation_start);if(!Number.isSafeInteger(start))throw Error('INVALID_UPGRADE_START');
   value={...base,kind:'scheduled_upgrade',reference:source.id,plan,currency:source.metadata.currency,amountMinor:planAmount(plan,source.metadata.currency),taxMinor:null,...(PERSONAL_PLANS[plan].kind==='subscription'?{renewalAmountMinor:planAmount(plan,source.metadata.currency)}:{}),startsAt:new Date(start*1000).toISOString()};
  }else{
   const currency=source.currency?.toUpperCase();if(source.mode!=='payment'||source.payment_status!=='paid'||!isBillingCurrency(currency))throw Error('UNPAID_CONFIRMATION');
   const rows=await billingDb().$queryRaw<Array<{valid_until:Date}>>`SELECT valid_until FROM medicea_billing.entitlement WHERE provider='stripe' AND external_id=${source.id} AND member_id=${member}::uuid AND customer_id=${customer}`;
   if(rows.length!==1||PERSONAL_PLANS[plan].kind!=='pass')throw Error('UNVERIFIED_PASS_CONFIRMATION');
   const end=new Date(rows[0].valid_until),start=new Date(end.getTime()-Number(PERSONAL_PLANS[plan].days)*86400000);
   value={...base,kind:'purchase',reference:source.id,plan,currency,amountMinor:source.amount_total,taxMinor:source.total_details?.amount_tax??null,startsAt:start.toISOString(),endsAt:end.toISOString()};
  }
 }else{
  if(!/^in_[A-Za-z0-9]+$/.test(original.id))throw Error('INVALID_CONFIRMATION_SOURCE');
  source=await stripeRequest('/invoices/'+original.id);customer=source.customer;
  if(source.livemode!==false||source.status!=='paid')throw Error('UNPAID_CONFIRMATION');
  const subId=source.parent?.subscription_details?.subscription||source.subscription;
  if(!subId&&source.metadata?.reservation_policy!=='medicea-next-access-v1')return; // Other one-off invoices do not grant app access.
  const sub=subId?await stripeRequest('/subscriptions/'+subId):null;member=sub?.metadata?.member_id||source.metadata?.member_id;
  if(sub&&(sub.livemode!==false||sub.customer!==customer))throw Error('CONFIRMATION_CUSTOMER_MISMATCH');
  const currency=source.currency?.toUpperCase(),lines=source.lines?.data;
  if(!isBillingCurrency(currency)||source.lines?.has_more||lines?.length!==1)throw Error('CONFIRMATION_INVOICE_REQUIRES_REVIEW');
  const price=lines[0].pricing?.price_details?.price||lines[0].price?.id;
  const plan=Object.keys(PERSONAL_PLANS).find(plan=>isPersonalPlan(plan)&&planPriceId(plan,currency)===price);
  if(!isPersonalPlan(plan))throw Error('UNVERIFIED_CONFIRMATION_PRICE');
  let start=lines[0].period?.start,end=lines[0].period?.end;
  if(!sub){const periods=await billingDb().$queryRaw<Array<{valid_until:Date}>>`SELECT valid_until FROM medicea_billing.entitlement WHERE provider='stripe' AND external_id=${source.id} AND member_id=${member}::uuid AND customer_id=${customer}`;if(periods.length!==1||PERSONAL_PLANS[plan].kind!=='pass')throw Error('UNVERIFIED_RESERVED_PASS_CONFIRMATION');end=Math.floor(new Date(periods[0].valid_until).getTime()/1000);start=end-Number(PERSONAL_PLANS[plan].days)*86400;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))throw Error('INVALID_CONFIRMATION_PERIOD');
  let renewalAmountMinor:number|undefined;
  if(sub){const recurringPrice=await stripeRequest('/prices/'+price);if(recurringPrice.livemode!==false||recurringPrice.currency!==currency.toLowerCase()||!Number.isSafeInteger(recurringPrice.unit_amount)||recurringPrice.recurring?.interval!==PERSONAL_PLANS[plan].interval)throw Error('UNVERIFIED_RENEWAL_PRICE');renewalAmountMinor=recurringPrice.unit_amount;}
  const taxes=source.total_taxes??source.total_tax_amounts;
  const tax=Array.isArray(taxes)?taxes.reduce((total:number,item:any)=>total+item.amount,0):null;
  value={...base,kind:source.billing_reason==='subscription_cycle'?'renewal':'purchase',reference:source.id,plan,currency,amountMinor:source.total,taxMinor:tax,...(sub?{renewalAmountMinor}:{}),startsAt:new Date(start*1000).toISOString(),endsAt:new Date(end*1000).toISOString()};
 }
 if(typeof member!=='string'||!/^[0-9a-f-]{36}$/i.test(member)||typeof customer!=='string'||!/^cus_[A-Za-z0-9]+$/.test(customer))throw Error('INVALID_CONFIRMATION_BINDING');
 const owners=await billingDb().$queryRaw<Array<{email:string}>>`SELECT u.email FROM medicea_billing.stripe_customer c JOIN auth.users u ON u.id=c.member_id WHERE c.member_id=${member}::uuid AND c.customer_id=${customer} AND u.email_confirmed_at IS NOT NULL`;
 if(owners.length!==1||!owners[0].email||/[\r\n]/.test(owners[0].email))throw Error('VERIFIED_CONFIRMATION_RECIPIENT_REQUIRED');
 const body=confirmationText(value),key='stripe:'+value.kind+':'+value.reference;
 await billingDb().$executeRaw`INSERT INTO medicea_billing.purchase_confirmation(provider_key,member_id,recipient,snapshot,body) VALUES(${key},${member}::uuid,${owners[0].email},${JSON.stringify(value)}::jsonb,${body}) ON CONFLICT(provider_key) DO NOTHING`;
}
export async function deliverConfirmations(){
 if(!confirmationsEnabled())return {enabled:false};
 const transport=confirmationMailTransport();await transport.verify(); // No queue claims if authentication/connection fails.
 await billingDb().$executeRaw`UPDATE medicea_billing.purchase_confirmation SET state='needs_review',last_error='STALE_SMTP_OUTCOME_UNKNOWN' WHERE state='processing' AND claimed_at<now()-interval '15 minutes'`;
 let accepted=0;
 for(let n=0;n<10;n++){
  const rows=await billingDb().$queryRaw<Array<{id:string;recipient:string;body:string}>>`UPDATE medicea_billing.purchase_confirmation SET state='processing',claimed_at=now() WHERE id=(SELECT id FROM medicea_billing.purchase_confirmation WHERE state='pending' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id::text,recipient,body`;
  const item=rows[0];if(!item)break;
  try{
   const sent=await transport.sendMail({from:{name:'medicéa Billing',address:'billing@medicea.global'},replyTo:'support@medicea.global',to:item.recipient,subject:'Your medicéa confirmation',messageId:`<medicea-confirmation-${item.id}@medicea.global>`,text:item.body,attachments:[{filename:'medicea-confirmation.txt',content:item.body,contentType:'text/plain; charset=utf-8'}]});
   if(!sent.accepted?.some((address:any)=>(typeof address==='string'?address:address.address)?.toLowerCase()===item.recipient.toLowerCase()))throw Error('RECIPIENT_NOT_ACCEPTED');
   await billingDb().$executeRaw`UPDATE medicea_billing.purchase_confirmation SET state='sent',accepted_at=now(),last_error=NULL WHERE id=${item.id}::uuid AND state='processing'`;accepted++;
  }catch{
   // SMTP lacks provider idempotency. Never retry an unknown post-send outcome automatically.
   await billingDb().$executeRaw`UPDATE medicea_billing.purchase_confirmation SET state='needs_review',last_error='SMTP_OUTCOME_REQUIRES_REVIEW' WHERE id=${item.id}::uuid AND state='processing'`;
  }
 }
 transport.close();return {enabled:true,accepted};
}
