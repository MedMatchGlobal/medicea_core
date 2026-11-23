import {BILLING_BUSINESS} from './business';

export const BILLING_INVOICE_FOOTER=[
 BILLING_BUSINESS.legalName,
 `Company number: ${BILLING_BUSINESS.companyNumber}; VAT number: ${BILLING_BUSINESS.vatNumber}`,
 BILLING_BUSINESS.address.join(', '),
].join('\n');

type Customer={id:string;livemode:boolean;metadata?:{member_id?:string};invoice_settings?:{footer?:string|null}};
type UpdateRequest=(path:string,params:URLSearchParams)=>Promise<any>;

// Presentation only: never changes tax registration, rates, payment methods or amounts.
export async function ensureCustomerInvoiceDetails(customer:Customer,member:string,request:UpdateRequest){
 if(customer.livemode!==false||!/^cus_[a-zA-Z0-9]+$/.test(customer.id)||customer.metadata?.member_id!==member)throw Error('Invoice customer ownership mismatch');
 const existing=customer.invoice_settings?.footer??'';
 if(typeof existing!=='string')throw Error('Invalid invoice footer');
 if(existing.includes(BILLING_INVOICE_FOOTER))return;
 const footer=[existing.trim(),BILLING_INVOICE_FOOTER].filter(Boolean).join('\n\n');
 if(footer.length>5000)throw Error('Invoice footer too long');
 const updated=await request('/customers/'+customer.id,new URLSearchParams({'invoice_settings[footer]':footer}));
 if(updated.livemode!==false||updated.id!==customer.id||updated.metadata?.member_id!==member||updated.invoice_settings?.footer!==footer)throw Error('Invoice details not saved');
}
