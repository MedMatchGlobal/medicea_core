import {createHash} from 'node:crypto';
import {db,audit} from './db';
import {customerFor} from './accounts';
import {stripe,paymentUrl} from './stripe';
import {ConsoleError,operationInput} from './policy';
type Operation=ReturnType<typeof operationInput>;
function validateChargeBinding(charge:any,customer:string,op:Operation){
 if(charge.id!==op.charge||charge.livemode!==false||charge.customer!==customer||charge.paid!==true||charge.status!=='succeeded'||charge.currency?.toUpperCase()!==op.currency)throw new ConsoleError('PURCHASE_BINDING_INVALID',409);
 if(charge.disputed===true)throw new ConsoleError('DISPUTED_PURCHASE_REQUIRES_REVIEW',409);
}
export function validateRefund(charge:any,customer:string,op:Operation){
 validateChargeBinding(charge,customer,op);
 if(!Number.isSafeInteger(charge.amount)||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||op.amountMinor>charge.amount-charge.amount_refunded)throw new ConsoleError('REFUND_EXCEEDS_BALANCE',409);
}
async function refund(customer:any,op:Operation){
 // Refund objects do not carry livemode. Verify the owning charge before any
 // refund lookup, recovery or mutation; do not require a missing Refund field.
 const charge=await stripe('/charges/'+op.charge);validateChargeBinding(charge,customer.id,op);
 const query=new URLSearchParams({charge:op.charge!,limit:'100'});
 for(let page=0;page<20;page++){
  const previous=await stripe('/refunds',undefined,undefined,query);
  const existing=previous.data?.find((r:any)=>r.metadata?.console_operation===op.id);
  if(existing){
   if(existing.livemode===true||existing.charge!==op.charge||existing.amount!==op.amountMinor||existing.currency?.toUpperCase()!==op.currency)throw new ConsoleError('REFUND_BINDING_INVALID',409);
   return {providerRef:existing.id,status:existing.status,amountMinor:existing.amount,currency:op.currency,message:'Recovered the existing refund. Subscription renewal is unchanged.'};
  }
  if(!previous.has_more)break;
  if(page===19||!previous.data?.at(-1)?.id)throw new ConsoleError('REFUND_HISTORY_REQUIRES_REVIEW',409);
  query.set('starting_after',previous.data.at(-1).id);
 }
 validateRefund(charge,customer.id,op);
 const result=await stripe('/refunds',new URLSearchParams({charge:op.charge!,amount:String(op.amountMinor),'metadata[console_operation]':op.id}), 'medicea-console-refund-'+op.id);
 if(result.livemode===true||result.charge!==op.charge||result.amount!==op.amountMinor||result.currency?.toUpperCase()!==op.currency||!/^re_[A-Za-z0-9]+$/.test(result.id))throw new ConsoleError('REFUND_RESULT_REQUIRES_REVIEW',502);
 return {providerRef:result.id,status:result.status,amountMinor:result.amount,currency:op.currency,message:'Check the final provider outcome. Subscription renewal is unchanged. Invoiced purchases may also require a linked credit note.'};
}
async function paymentRequest(customer:any,op:Operation){
 const taxCode=process.env.MEDICEA_CONSOLE_TAX_CODE,productId=process.env.MEDICEA_CONSOLE_PRODUCT;
 if(taxCode!=='txcd_10701401'||!productId||!/^prod_[A-Za-z0-9]+$/.test(productId))throw new ConsoleError('TAX_CONFIGURATION_REQUIRED',503);
 const product=await stripe('/products/'+productId);
 if(product.id!==productId||product.livemode!==false||product.active!==true||(typeof product.tax_code==='string'?product.tax_code:product.tax_code?.id)!==taxCode)throw new ConsoleError('TAX_CONFIGURATION_REQUIRED',503);
 const settings=await stripe('/tax/settings'),registration=await stripe('/tax/registrations',undefined,undefined,new URLSearchParams({status:'active',limit:'100'}));
 if(settings.status!=='active'||!registration.data?.some((r:any)=>r.country==='GB'&&r.active_from<=Date.now()/1000&&(!r.expires_at||r.expires_at>Date.now()/1000)))throw new ConsoleError('TAX_CONFIGURATION_REQUIRED',503);
 const origin=process.env.MEDICEA_CONSOLE_ORIGIN;if(!origin)throw new ConsoleError('CONSOLE_UNAVAILABLE',503);
 const integration='medicea_owner_console_'+createHash('sha256').update(op.id).digest('hex').slice(0,8).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
 const session=await stripe('/checkout/sessions',new URLSearchParams({mode:'payment',integration_identifier:integration,customer:customer.id,client_reference_id:op.member,
  'line_items[0][price_data][currency]':op.currency.toLowerCase(),'line_items[0][price_data][product]':productId,'line_items[0][price_data][unit_amount]':String(op.amountMinor),'line_items[0][price_data][tax_behavior]':'inclusive','line_items[0][quantity]':'1',
  'automatic_tax[enabled]':'true',billing_address_collection:'required','customer_update[address]':'auto',
  'invoice_creation[enabled]':'true','invoice_creation[invoice_data][footer]':'G.E.S. Consultancy Limited · Company 07467951 · VAT GB104912052 · 87 Arlington Gardens, Romford, RM3 0EB, United Kingdom. Contact support@medicea.global.',
  'metadata[console_operation]':op.id,'metadata[member_id]':op.member,'metadata[console_policy]':'customer-approved-payment-request-v1',
  'payment_intent_data[metadata][console_operation]':op.id,
  'custom_text[submit][message]':op.description+' One-off payment request. Your plan and access do not change.',
  success_url:origin+'/payment-result?result=returned',cancel_url:origin+'/payment-result?result=cancelled'
 }),'medicea-console-checkout-'+op.id);
 const url=paymentUrl(session.url);
 if(session.livemode!==false||session.customer!==customer.id||session.client_reference_id!==op.member||session.metadata?.console_operation!==op.id||session.currency?.toUpperCase()!==op.currency||session.amount_total!==op.amountMinor||!url||!/^cs_test_[A-Za-z0-9]+$/.test(session.id))throw new ConsoleError('PAYMENT_REQUEST_REQUIRES_REVIEW',409);
 return {providerRef:session.id,status:session.status,expiresAt:session.expires_at,amountMinor:op.amountMinor,currency:op.currency,url,message:'Payment link created. No saved card was charged and no email was sent. This request does not grant or change access.'};
}
async function paymentCustomer(member:string){
 try{return await customerFor(member);}catch(error){if(!(error instanceof ConsoleError)||error.code!=='NO_STRIPE_ACCOUNT')throw error;}
 const connection=await db().connect();try{
  await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))',[member]);
  const binding=await connection.query('SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=$1',[member]);
  if(!binding.rows.length){
   const users=await connection.query('SELECT email,email_confirmed_at FROM medicea_billing.console_account WHERE id=$1',[member]);
   if(!users.rows[0]?.email_confirmed_at)throw new ConsoleError('VERIFIED_ACCOUNT_REQUIRED',409);
   const customer=await stripe('/customers',new URLSearchParams({email:users.rows[0].email,'metadata[member_id]':member}),'member-customer-'+member);
   if(customer.livemode!==false||customer.metadata?.member_id!==member||!/^cus_[A-Za-z0-9]+$/.test(customer.id))throw new ConsoleError('CUSTOMER_BINDING_INVALID',409);
   await connection.query('INSERT INTO medicea_billing.stripe_customer(member_id,customer_id) VALUES($1,$2)',[member,customer.id]);
  }
  await connection.query('COMMIT');
 }catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release();}
 return customerFor(member);
}
export async function performOperation(actor:string,body:unknown){
 const op=operationInput(body),fingerprint=createHash('sha256').update(JSON.stringify(op)).digest('hex');
 const customer=op.action==='payment_request'?await paymentCustomer(op.member):await customerFor(op.member);
 await db().query(`INSERT INTO medicea_billing.console_operation(id,actor_id,member_id,action,fingerprint,payload,amount_minor,currency,reason)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,[op.id,actor,op.member,op.action,fingerprint,JSON.stringify(op),op.amountMinor,op.currency,op.reason]);
 const stored=(await db().query('SELECT * FROM medicea_billing.console_operation WHERE id=$1',[op.id])).rows[0];
 if(stored.actor_id!==actor||stored.fingerprint!==fingerprint)throw new ConsoleError('OPERATION_ID_REUSED',409);
 if(stored.state==='succeeded')return stored.result;
 if(Date.now()-new Date(stored.created_at).getTime()>23*60*60*1000)throw new ConsoleError('MANUAL_RECONCILIATION_REQUIRED',409);
 await audit(actor,'operation.requested',op.member,op.id,{action:op.action,amountMinor:op.amountMinor,currency:op.currency});
 try{
  const result=op.action==='refund'?await refund(customer,op):await paymentRequest(customer,op);
  await audit(actor,'operation.provider_result',op.member,op.id,result);
  await db().query("UPDATE medicea_billing.console_operation SET state='succeeded',result=$2,provider_ref=$3,updated_at=now() WHERE id=$1",[op.id,JSON.stringify(result),result.providerRef]);
  return result;
 }catch(error){
  const code=error instanceof ConsoleError?error.code:'PROVIDER_OUTCOME_UNKNOWN';
  await audit(actor,'operation.needs_review',op.member,op.id,{code});
  await db().query("UPDATE medicea_billing.console_operation SET state='needs_review',updated_at=now() WHERE id=$1 AND state<>'succeeded'",[op.id]);
  throw new ConsoleError(code,error instanceof ConsoleError?error.status:503);
 }
}
