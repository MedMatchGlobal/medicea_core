import {stripeRequest} from './stripe';
type ProviderRequest=typeof stripeRequest;
function id(value:any){return typeof value==='string'?value:value?.id;}
async function intentSettled(intentId:string,customer:string,request:ProviderRequest){
 if(!/^pi_[a-zA-Z0-9]+$/.test(intentId))throw Error('Missing payment intent');
 const intent=await request('/payment_intents/'+intentId);
 if(intent.livemode!==false||id(intent.customer)!==customer)throw Error('Payment ownership mismatch');
 if(intent.status!=='succeeded')return false;
 const chargeId=id(intent.latest_charge);if(!/^ch_[a-zA-Z0-9]+$/.test(chargeId))throw Error('Missing charge');
 const charge=await request('/charges/'+chargeId);
 if(charge.livemode!==false||id(charge.customer)!==customer||id(charge.payment_intent)!==intentId)throw Error('Charge ownership mismatch');
 if(charge.paid!==true||charge.status!=='succeeded'||charge.captured!==true)return false;
 if(!Number.isSafeInteger(charge.amount_captured)||charge.amount_captured<=0||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>charge.amount_captured)throw Error('Invalid refund amount');
 if(charge.amount_refunded===charge.amount_captured)return false;
 const disputeId=id(charge.dispute);
 if(disputeId){
  if(!/^dp_[a-zA-Z0-9]+$/.test(disputeId))throw Error('Invalid dispute');
  const dispute=await request('/disputes/'+disputeId);
  if(dispute.livemode!==false||id(dispute.charge)!==charge.id)throw Error('Dispute ownership mismatch');
  return dispute.status==='won'||dispute.status==='warning_closed';
 }
 return charge.disputed!==true;
}
export async function invoiceSettled(invoice:any,request:ProviderRequest=stripeRequest){
 if(invoice.livemode!==false||typeof invoice.customer!=='string'||!/^in_[a-zA-Z0-9]+$/.test(invoice.id))throw Error('Invalid invoice');
 if(invoice.status!=='paid')return false;
 const result=await request('/invoice_payments',undefined,undefined,15000,undefined,new URLSearchParams({invoice:invoice.id,status:'paid',limit:'100'}));
 if(!Array.isArray(result.data)||result.has_more)throw Error('Incomplete invoice payments');
 const payments=result.data.filter((p:any)=>p.status==='paid');
 if(!payments.length)throw Error('Missing invoice payment');
 for(const payment of payments){
  if(payment.livemode!==false||id(payment.invoice)!==invoice.id||payment.payment?.type!=='payment_intent')throw Error('Unsupported invoice payment');
  if(!await intentSettled(id(payment.payment.payment_intent),invoice.customer,request))return false;
 }
 return true;
}
export async function purchaseSettled(source:any,kind:'checkout'|'invoice'|'subscription',request:ProviderRequest=stripeRequest){
 if(kind==='checkout')return intentSettled(id(source.payment_intent),source.customer,request);
 if(kind==='invoice')return invoiceSettled(source,request);
 const invoiceId=id(source.latest_invoice);if(!/^in_[a-zA-Z0-9]+$/.test(invoiceId))throw Error('Missing subscription invoice');
 const invoice=await request('/invoices/'+invoiceId);
 if(invoice.customer!==source.customer)throw Error('Invoice ownership mismatch');
 return invoiceSettled(invoice,request);
}
