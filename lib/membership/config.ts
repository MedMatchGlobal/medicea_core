export function membershipPageEnabled() {
  return process.env.VERCEL_ENV === 'preview' || (
    !process.env.VERCEL_ENV && process.env.NODE_ENV === 'development'
  );
}

export function membershipPreviewEnabled() {
  return process.env.MEDICEA_MEMBERSHIP_PREVIEW === 'true' && (
    process.env.VERCEL_ENV === 'preview' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'development')
  );
}
// Enable only after the sandbox's tax category, registration and inclusive prices are verified.
export function stripeTaxPreviewEnabled() {
  return membershipPreviewEnabled() && process.env.MEDICEA_STRIPE_TAX_PREVIEW === 'true';
}
export function stripeProductTaxCode() {
  const code = process.env.STRIPE_PERSONAL_TAX_CODE || '';
  if (!/^txcd_[0-9]+$/.test(code)) throw Error('Confirmed product tax code missing');
  return code;
}
// Account sign-in can be tested without enabling paid search metering.
export function membershipAccountEnabled() {
  return membershipPreviewEnabled() || (
    membershipPageEnabled() && process.env.MEDICEA_ACCOUNT_PREVIEW === 'true'
  );
}
export const TRIAL = {days:7, successfulSearches:5} as const;
export const PERSONAL_PLANS = {
  pass7: {label:'7-day pass',amountMinor:149,currency:'GBP',kind:'pass',days:7,interval:null},
  pass14: {label:'14-day pass',amountMinor:199,currency:'GBP',kind:'pass',days:14,interval:null},
  pass30: {label:'30-day pass',amountMinor:299,currency:'GBP',kind:'pass',days:30,interval:null},
  monthly: {label:'Personal monthly',amountMinor:299,currency:'GBP',kind:'subscription',days:null,interval:'month'},
  annual: {label:'Personal annual',amountMinor:1999,currency:'GBP',kind:'subscription',days:null,interval:'year'},
} as const;
export type PersonalPlan = keyof typeof PERSONAL_PLANS;
export const BILLING_CURRENCIES = ['GBP', 'EUR', 'USD'] as const;
export type BillingCurrency = typeof BILLING_CURRENCIES[number];
export const PLAN_AMOUNTS: Record<BillingCurrency, Record<PersonalPlan, number>> = {
  GBP: {pass7:149, pass14:199, pass30:299, monthly:299, annual:1999},
  EUR: {pass7:179, pass14:249, pass30:359, monthly:359, annual:2399},
  USD: {pass7:199, pass14:279, pass30:399, monthly:399, annual:2649},
};
export function isBillingCurrency(value: unknown): value is BillingCurrency {
  return BILLING_CURRENCIES.some(currency => currency === value);
}
export function planAmount(plan: PersonalPlan, currency: BillingCurrency = 'GBP') {
  return PLAN_AMOUNTS[currency][plan];
}
export function isPersonalPlan(value:unknown):value is PersonalPlan {
  return typeof value==='string'&&Object.prototype.hasOwnProperty.call(PERSONAL_PLANS,value);
}
// Proposal only: no scheduled switch and no automatic customer repricing.
export const POSSIBLE_LATER_PRICES = {pass7:199,pass14:299,pass30:399,monthly:349,annual:1999} as const;
export function periodKey(now = new Date()) {
  return now.toISOString().slice(0, 7); // UTC calendar month, shared by every device
}
export function stripeTestKey() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key.startsWith('sk_test_')) throw new Error('Stripe test mode is not configured');
  return key;
}
export function membershipOrigin() {
  const value = process.env.MEDICEA_MEMBERSHIP_ORIGIN;
  if (!value) throw new Error('Membership origin missing');
  const url = new URL(value);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid membership origin');
  return url.origin;
}
export function sameOrigin(req: Request) {
  return req.headers.get('origin') === membershipOrigin();
}
