export function isMedicineName(value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>600)return false;
 const name=value.trim();
 return !isEmptyMatchText(name)&&!/^(?:i(?:['’]m| am) sorry\b|sorry\b|i (?:cannot|can['’]t|am unable|do not have)\b|unable to\b|there (?:are|is) no\b|no (?:exact )?(?:matching )?(?:results?|match(?:es)?|equivalents?|products?)\b|not found\b)/i.test(name)&&!/[<>]/.test(name);
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
export function equivalentPresentation(value:string){
 const clean=cleanMatchText(value),split=clean.search(/\s+[—–]\s+/);
 if(split<0)return {title:clean,details:'',uncertainty:''};
 const title=clean.slice(0,split).trim(),details=clean.slice(split).replace(/^\s*[—–]\s*/,'').trim();
 const uncertainty=details.split(/(?<=[.;])\s+/).filter(s=>/\b(?:not confirmed|not established|not verified|unconfirmed|unverified|uncertain|unknown)\b/i.test(s)).join(' ');
 return {title,details,uncertainty};
}
