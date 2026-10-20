// Source preference is an owner-approved research instruction, not a domain or
// country allowlist. URL checks establish provenance, not medical verification.
export const COUNTRY_SOURCE_GUIDANCE='Search the web without restricting countries or websites to a predefined list. For the requested product country, prioritise authoritative and reliable product information: the national medicines regulator, official country-specific product information, the manufacturer or marketing-authorisation holder, and recognised national medicines references. Use reliable licensed local pharmacy information as supporting evidence when appropriate. A foreign-hosted manufacturer document is usable when it explicitly concerns the requested country. Prefer primary evidence, check that each source concerns the exact product and requested country, and do not assume that a product sold elsewhere is sold here. Do not use search snippets, forums or promotional claims alone to establish product facts. State uncertainty through the supplied output contract; do not invent facts or claim exhaustive worldwide coverage.';

export function researchUrl(value:unknown):string|null{
 try{if(typeof value!=='string'||value.length>2048)return null;const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}
}
export function retrievedResearchUrls(payload:any){
 const urls=new Set<string>();for(const o of payload.output||[])if(o.type==='web_search_call'&&o.status==='completed')for(const s of o.action?.sources||[]){const url=researchUrl(s.url);if(url)urls.add(url);}return urls;
}
