export function isMedicineName(value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>600)return false;
 const name=value.trim();
 return !isEmptyMatchText(name)&&!isSearchSummary(name)&&!/^(?:i(?:['’]m| am) sorry\b|sorry\b|i (?:cannot|can['’]t|am unable|do not have)\b|unable to\b|there (?:are|is) no\b|no (?:exact )?(?:matching )?(?:results?|match(?:es)?|equivalents?|products?)\b|not found\b)/i.test(name)&&!/[<>]/.test(name);
}
export function isSearchSummary(value:string){
 return /^(?:(?:only|a total of|in total)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(?:matching|verified|confirmed)\s+)*(?:products?|medicines?|matches|results?)\b|(?:both|all|these|the above)\s+(?:(?:matching|listed|identified)\s+)?(?:products|medicines|results)\s+(?:are|were|have|require|contain)\b|(?:note|summary|sources?)\s*[:—])/i.test(cleanMatchText(value));
}
export function isEmptyMatchText(value:string){
 const text=cleanMatchText(value);
 return /^(?:no (?:(?:verified|confirmed|exact|matching)\s+)*(?:results?|match(?:es)?|equivalents?|products?)(?:\s+(?:were |could be )?found)?|not found)(?:[.!:…]|$)/i.test(text);
}
export function cleanMatchText(value:string){
 return value.replace(/&#(?:x([a-f0-9]+)|(\d+));/gi,(raw,hex,decimal)=>{const n=Number.parseInt(hex||decimal,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):raw;})
  .replace(/&nbsp;/gi,' ').replace(/&mdash;/gi,'—').replace(/&ndash;/gi,'–').replace(/&amp;/gi,'&').replace(/\*\*|__/g,'').replace(/\s+/g,' ').trim();
}
// Presentation only. Keep the original result for storage and matching; pass
// the clean product identity, not the commentary, to leaflet lookup controls.
export function equivalentPresentation(value:string,country=''){
 const clean=cleanMatchText(value),split=clean.search(/\s+[—–]\s+/);
 if(split<0)return {title:clean,details:'',uncertainty:''};
 let title=clean.slice(0,split).trim();const details=clean.slice(split).replace(/^\s*[—–]\s*/,'').trim();
 // Preserve a supplier explicitly present in the result. Do not infer one from
 // pack counts, active ingredients or an authorisation note.
 const countryPattern=country.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const company=countryPattern?details.match(new RegExp('^(.{2,120}?),\\s*'+countryPattern+'(?:[.;]|$)','i'))?.[1]?.trim():undefined;
 if(company&&!/\d|\b(?:tablets?|capsules?|sachets?|contains?|pack|AIC|authorisation|authorization|licence|license)\b/i.test(company)&&!title.toLowerCase().includes(company.toLowerCase()))title+=' — '+company;
 const uncertainty=details.split(/(?<=[.;])\s+/).filter(s=>/\b(?:not confirmed|not established|not verified|unconfirmed|unverified|uncertain|unknown)\b/i.test(s)).join(' ');
 return {title,details,uncertainty};
}
// Membership checks bind to the original returned result. Only after those
// checks may the leaflet route derive its concise manufacturer-specific query.
export function equivalentLeafletName(drugName:unknown,resultEntry:unknown,country:unknown){
 return typeof drugName==='string'&&resultEntry===drugName&&isMedicineName(drugName)&&typeof country==='string'?equivalentPresentation(drugName,country).title:drugName;
}
