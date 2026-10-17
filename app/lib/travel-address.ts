export type AddressQuery={text:string;country:string;lang:string};
const countries=['GB','IT','FR','ES','DE','PT','US','AU'];
const languages=['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh'];
export function addressQuery(value:unknown):AddressQuery|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(key=>!['text','country','lang'].includes(key))||typeof v.text!=='string'||v.text.trim().length<4||v.text.length>240||/[\u0000-\u001f\u007f]/.test(v.text)||!countries.includes(v.country as string)||!languages.includes(v.lang as string))return null;
 return {text:v.text.trim(),country:v.country as string,lang:v.lang as string};
}
export function addressProviderUrl(query:AddressQuery,key:string){
 const url=new URL('https://api.geoapify.com/v1/geocode/autocomplete');
 url.search=new URLSearchParams({text:query.text,filter:'countrycode:'+query.country.toLowerCase(),lang:query.lang,format:'json',limit:'5',apiKey:key}).toString();return url;
}
export function addressSuggestions(value:unknown,country:string):string[]{
 const raw=value as {results?:unknown[]};const results:string[]=[];
 if(!Array.isArray(raw?.results))return results;
 for(const item of raw.results.slice(0,20)){
  if(!item||typeof item!=='object')continue;const v=item as Record<string,unknown>;
  if(v.country_code!==country.toLowerCase()||typeof v.formatted!=='string'||v.formatted.length>240||/[\u0000-\u001f\u007f<>]/.test(v.formatted))continue;
  const label=v.formatted.trim();if(label&&!results.includes(label))results.push(label);if(results.length===5)break;
 }return results;
}
