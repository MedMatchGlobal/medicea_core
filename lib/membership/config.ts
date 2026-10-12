export function membershipPreviewEnabled() {
  return process.env.MEDICEA_MEMBERSHIP_PREVIEW === 'true' && (
    process.env.VERCEL_ENV === 'preview' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'development')
  );
}
export const PERSONAL_PLANS = {
  monthly: { label: 'Monthly', amountMinor: 499, currency: 'GBP', interval: 'month' },
  annual: { label: 'Annual', amountMinor: 4999, currency: 'GBP', interval: 'year' },
} as const;
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
