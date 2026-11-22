import type {BillingCurrency} from './config';

const EURO_COUNTRIES = new Set('AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES BG'.split(' '));

export function currencyForCountry(country: string | null | undefined): BillingCurrency {
  const code = country?.trim().toUpperCase();
  return code === 'US' ? 'USD' : code && EURO_COUNTRIES.has(code) ? 'EUR' : 'GBP';
}

export function canonicalMembershipUrl(configuredOrigin: string | undefined, requestHost: string | null, checkout?: string | string[]): string | null {
  if (!configuredOrigin || !requestHost) return null;
  const target = new URL('/membership', configuredOrigin);
  if (target.host.toLowerCase() === requestHost.toLowerCase()) return null;
  if (checkout === 'returned' || checkout === 'cancelled') target.searchParams.set('checkout', checkout);
  return target.toString();
}
