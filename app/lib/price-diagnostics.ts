// Fixed Dev diagnostics only; never include provider messages or query content.
export const PRICE_DIAGNOSTICS=['PRICE_FOUND','PRICE_NO_MATCH','PRICE_TIMEOUT','PRICE_BUDGET_EXHAUSTED','PRICE_INCOMPLETE_RESPONSE','PRICE_INVALID_RESPONSE','PRICE_QUOTES_REJECTED','PRICE_UNAVAILABLE','PRICE_DISABLED'] as const;
export type PriceDiagnostic=typeof PRICE_DIAGNOSTICS[number];
export function priceDiagnostic(value:unknown):PriceDiagnostic|undefined{
 return typeof value==='string'&&PRICE_DIAGNOSTICS.includes(value as PriceDiagnostic)?value as PriceDiagnostic:undefined;
}
