// Source preference is an owner-approved research instruction, not a domain or
// country allowlist. URL checks establish provenance, not medical verification.
export const COUNTRY_SOURCE_GUIDANCE='Search the web without restricting countries or websites to a predefined list. For the requested product country, prioritise authoritative and reliable product information: the national medicines regulator, official country-specific product information, the manufacturer or marketing-authorisation holder, and recognised national medicines references. Use reliable licensed local pharmacy information as supporting evidence when appropriate. A foreign-hosted manufacturer document is usable when it explicitly concerns the requested country. Prefer primary evidence, check that each source concerns the exact product and requested country, and do not assume that a product sold elsewhere is sold here. Do not use search snippets, forums or promotional claims alone to establish product facts. State uncertainty through the supplied output contract; do not invent facts or claim exhaustive worldwide coverage.';

export function researchUrl(value:unknown):string|null{
 try{if(typeof value!=='string'||value.length>2048)return null;const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}
}
// Only tracking and in-page anchors are irrelevant to document identity.
// Product IDs, other query parameters, paths and hosts must still agree.
export function researchDocumentKey(value:unknown):string|null{
 const safe=researchUrl(value);if(!safe)return null;
 const url=new URL(safe);url.hash='';
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'])url.searchParams.delete(key);
 return url.href;
}
export function matchRetrievedLeafletSources(claimed:unknown,retrieved:Set<string>):string[]{
 if(!Array.isArray(claimed)||!claimed.length||claimed.length>5)throw Error('UNSUPPORTED_LEAFLET_SOURCES');
 const documents=new Map<string,string>();
 for(const source of retrieved){const key=researchDocumentKey(source);if(key&&!documents.has(key))documents.set(key,source);}
 const matched=claimed.map(source=>{const key=researchDocumentKey(source),actual=key?documents.get(key):undefined;if(!actual)throw Error('UNSUPPORTED_LEAFLET_SOURCES');return actual;});
 return [...new Set(matched)];
}
export function retrievedResearchUrls(payload:any,includeOpenedPages=false){
 const urls=new Set<string>();
 for(const o of payload.output||[]){
  if(o.type!=='web_search_call'||o.status!=='completed')continue;
  for(const s of o.action?.sources||[]){const url=researchUrl(s.url);if(url)urls.add(url);}
  // Page-opening actions expose their retrieved URL directly, rather than in
  // search-result sources. Opt in only for the approved leaflet experiment.
  if(includeOpenedPages&&['open_page','find_in_page'].includes(o.action?.type)){
   const url=researchUrl(o.action.url);if(url)urls.add(url);
  }
 }
 return urls;
}
