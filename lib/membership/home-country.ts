import countriesByRegion from '@/data/countries';
import {currencyForCountry} from './presentation';

const countries = new Set(Object.values(countriesByRegion).flat());
const euroCountries = new Set('Austria|Belgium|Bulgaria|Croatia|Cyprus|Estonia|Finland|France|Germany|Greece|Ireland|Italy|Latvia|Lithuania|Luxembourg|Malta|Netherlands|Portugal|Slovakia|Slovenia|Spain|Andorra|Monaco|Montenegro|San Marino|Holy See (Vatican City State)|Mayotte|Réunion'.split('|'));

export function validHomeCountry(value: unknown): string | null {
  return typeof value === 'string' && countries.has(value) ? value : null;
}

export function homeCountryCurrency(homeCountry: unknown, detectedCountry?: string | null) {
  const country = validHomeCountry(homeCountry);
  if (!country) return currencyForCountry(detectedCountry);
  return country === 'United States' ? 'USD' : euroCountries.has(country) ? 'EUR' : 'GBP';
}

// An explicit search choice (including a restored search) always wins over the default.
export function defaultSourceCountry(current: string, homeCountry: unknown) {
  return current || validHomeCountry(homeCountry) || '';
}
