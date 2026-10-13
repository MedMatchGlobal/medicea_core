export function membershipPreviewEnabled() {
  return process.env.MEDICEA_MEMBERSHIP_PREVIEW === 'true' && (
    process.env.VERCEL_ENV === 'preview' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'development')
  );
}
export const TRIAL = {days:7, successfulSearches:5} as const;
export const PERSONAL_PLANS = {
  pass7: {label:'7-day pass',amountMinor:149,currency:'GBP',kind:'pass',days:7,interval:null},
  pass14: {label:'14-day pass',amountMinor:199,currency:'GBP',kind:'pass',days:14,interval:null},
  pass30: {label:'30-day pass',amountMinor:299,currency:'GBP',kind:'pass',days:30,interval:null},
  monthly: {label:'Personal monthly',amountMinor:249,currency:'GBP',kind:'subscription',days:null,interval:'month'},
  annual: {label:'Personal annual',amountMinor:1999,currency:'GBP',kind:'subscription',days:null,interval:'year'},
} as const;
export type PersonalPlan = keyof typeof PERSONAL_PLANS;
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
