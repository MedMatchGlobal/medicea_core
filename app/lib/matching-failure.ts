export class MatchingSearchError extends Error {
 constructor(public readonly kind:'unconfirmed'|'failed') {super('Equivalent lookup did not complete.');}
}
export function matchingFailure(status:number,code:unknown) {
 return new MatchingSearchError(status===422&&['NOT_FOUND_ORIGIN','ORIGIN_STRENGTH_MISMATCH'].includes(String(code))?'unconfirmed':'failed');
}
