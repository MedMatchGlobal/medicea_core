import {BILLING_BUSINESS} from './business';
import {PERSONAL_PLANS,isPersonalPlan,isBillingCurrency,type PersonalPlan,type BillingCurrency} from './config';
export type Confirmation={version:'2026-11-23';kind:'purchase'|'renewal'|'scheduled_upgrade';reference:string;plan:PersonalPlan;currency:BillingCurrency;amountMinor:number;taxMinor:number|null;renewalAmountMinor?:number;startsAt:string;endsAt?:string;issuedAt:string};
export function confirmationText(value:Confirmation){
 if(value.version!=='2026-11-23'||!isPersonalPlan(value.plan)||!isBillingCurrency(value.currency)||!Number.isSafeInteger(value.amountMinor)||value.amountMinor<0||value.taxMinor!==null&&(!Number.isSafeInteger(value.taxMinor)||value.taxMinor<0||value.taxMinor>value.amountMinor)||![value.startsAt,value.issuedAt,...(value.endsAt?[value.endsAt]:[])].every(date=>Number.isFinite(Date.parse(date)))||!/^(cs_test_|in_)[A-Za-z0-9]+$/.test(value.reference))throw Error('INVALID_CONFIRMATION');
 const london=(date:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date(date))+' (London time)';
 const scheduled=value.kind==='scheduled_upgrade',plan=PERSONAL_PLANS[value.plan],money=(amount:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:value.currency}).format(amount/100);
 if(plan.kind==='subscription'&&(!Number.isSafeInteger(value.renewalAmountMinor)||value.renewalAmountMinor!<0))throw Error('INVALID_RENEWAL_CONFIRMATION');
 return [
 'medicéa — '+(scheduled?'Scheduled upgrade confirmation':value.kind==='renewal'?'Subscription renewal confirmation':'Purchase confirmation'),
 `Confirmation version ${value.version} (English)`, `Reference: ${value.reference}`,`Issued: ${london(value.issuedAt)}`,'',
 BILLING_BUSINESS.legalName,`Company ${BILLING_BUSINESS.companyNumber}; VAT ${BILLING_BUSINESS.vatNumber}`,BILLING_BUSINESS.address.join(', '),'Billing: billing@medicea.global','Support, cancellation and refund requests: support@medicea.global','',
 `Plan: ${plan.label}`,`Starts: ${london(value.startsAt)}`,...(value.endsAt?[`Current paid period ends: ${london(value.endsAt)}`]:[]),
 scheduled?'Charge now: '+money(0):'Total payment: '+money(value.amountMinor),
 scheduled?'Authorised charge on or after the start date: '+money(value.amountMinor):value.taxMinor===null?'Price includes applicable tax; refer to your Stripe invoice for the breakdown.':`Tax included in total: ${money(value.taxMinor)}`,
 plan.kind==='pass'?`One payment for ${plan.days} days. Ends automatically; no renewal or trial.`:`Renews every ${plan.interval==='year'?'year':'month'} at ${money(value.renewalAmountMinor!)} including applicable tax until cancelled. Your billing account shows the next renewal date. Any future price change requires the applicable advance notice.`,
 scheduled?'Your current paid access and saved searches stay in place. You can cancel the scheduled upgrade in your account before it starts.':plan.kind==='subscription'?'Manage subscription renewal in your account through Billing · Stripe. Cancelling renewal preserves paid access until the end of its paid period.':'Your pass ends automatically. Your saved searches stay in place.',
 '', 'Voluntary refund policy: Request a full refund within 14 days of an initial pass or subscription payment through support@medicea.global. Renewal refunds are considered individually. Statutory rights remain unchanged.',
 'A refund does not by itself cancel subscription renewal. Tell support if you want both.',
 '', 'Personal use only. Educational medicine information; not a diagnosis, prescription or substitute for a qualified healthcare professional. Do not change treatment without professional advice. For an emergency use local emergency services.',
 'Keep this confirmation. It records the commercial terms captured for this transaction; it is not a VAT invoice and does not replace your Stripe invoice.'
 ].join('\n');
}
