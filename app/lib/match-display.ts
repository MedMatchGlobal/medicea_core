export function isMedicineName(value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>600)return false;
 const name=value.trim();
 return !/^(?:i(?:['’]m| am) sorry\b|sorry\b|i (?:cannot|can['’]t|am unable|do not have)\b|unable to\b|there (?:are|is) no\b|no (?:exact )?(?:matching )?(?:results?|match(?:es)?|equivalents?|products?)\b|not found\b)/i.test(name)&&!/[<>]/.test(name);
}
export function isEmptyMatchText(value:string){return /^(?:no (?:exact )?(?:matching )?(?:results?|match(?:es)?|equivalents?|products?)(?: found)?|not found)[.!\s]*$/i.test(value.trim());}
