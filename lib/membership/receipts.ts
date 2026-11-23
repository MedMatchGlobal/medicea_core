import {billingDb} from './store';
import {stripeRequest} from './stripe';

export type PaymentReceipt={id:string;created:number;amountMinor:number;refundedMinor:number;currency:string;receiptUrl:string|null};
export async function memberReceipts(member:string,after?:string){
 if(after&&!/^ch_[a-zA-Z0-9]+$/.test(after))throw Error('Invalid payment cursor');
 const customers=await billingDb().$queryRaw<Array<{customer_id:string}>>`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid`;
 if(!customers.length)return {payments:[],hasMore:false,next:null};
 if(customers.length!==1||!/^cus_[a-zA-Z0-9]+$/.test(customers[0].customer_id))throw Error('Invalid billing account');
 const customer=customers[0].customer_id;
 const query=new URLSearchParams({customer,limit:'20'});if(after)query.set('starting_after',after);
 const result=await stripeRequest('/charges',undefined,undefined,15000,undefined,query);
 if(!Array.isArray(result.data))throw Error('Invalid payment history');
 const payments:PaymentReceipt[]=[];
 for(const charge of result.data){
  if(charge.livemode!==false||charge.customer!==customer||!/^ch_[a-zA-Z0-9]+$/.test(charge.id))throw Error('Payment ownership mismatch');
  if(charge.paid!==true||charge.status!=='succeeded')continue;
  if(!Number.isSafeInteger(charge.amount)||charge.amount<0||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>charge.amount||!Number.isSafeInteger(charge.created)||!['gbp','eur','usd'].includes(charge.currency))throw Error('Invalid payment details');
  let receiptUrl:string|null=null;
  if(typeof charge.receipt_url==='string'){try{const url=new URL(charge.receipt_url);if(url.protocol==='https:'&&url.hostname==='pay.stripe.com'&&!url.username&&!url.password)receiptUrl=url.toString();}catch{}}
  payments.push({id:charge.id,created:charge.created,amountMinor:charge.amount,refundedMinor:charge.amount_refunded,currency:charge.currency.toUpperCase(),receiptUrl});
 }
 const last=result.data.at(-1)?.id;
 return {payments,hasMore:result.has_more===true,next:result.has_more===true&&/^ch_[a-zA-Z0-9]+$/.test(last)?last:null};
}
