// Restored verbatim helpers from origin/experiment/claude-sonnet-preview. No country/source allowlists are imported.
import {createHmac,timingSafeEqual} from 'node:crypto';
import {claudePreviewEnabled} from './claude-preview';
const norm=(value:unknown)=>typeof value==='string'?value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' '):'';
const country=(value:unknown)=>({uk:'united kingdom',gb:'united kingdom',us:'united states',usa:'united states'}[norm(value)]||norm(value));
type Ingredient={name:string;strength:string};
type Profile={name:string;country:string;form:string;route:string;species:string[];complete:boolean;generic:boolean;ingredients:Ingredient[];sources:string[]};
export function selectedCombinationAgrees(hint:unknown,ingredients:Ingredient[]):boolean|null {
 if(typeof hint!=='string'||!hint.trim())return null;
 const parts=hint.trim().split(/\s*(?:\+|\/)\s*/);
 if(parts.length<2||parts.some(p=>!/^\d+(?:\.\d+)?\s*(?:mg)?$/i.test(p)))return null;
 const amounts=parts.map(p=>Number.parseFloat(p)).sort((a,b)=>a-b);
 const labels=ingredients.map(i=>i.strength.match(/^(\d+(?:\.\d+)?)\s*mg\s*(?:(?:per|\/)\s*(?:tablet|capsule))?$/i));
 if(labels.some(m=>!m))return null;
 const values=labels.map(m=>Number(m![1])).sort((a,b)=>a-b);
 return JSON.stringify(amounts)===JSON.stringify(values);
}
function strengthKey(value:string){
 // Formatting equivalence only: 500.0 mg == 500 mg. No unit, salt or
 // concentration conversion; e.g. mg/ml must never collapse into mg/tablet.
 return norm(value).replace(/\d+(?:\.\d+)?/g,number=>{
  const [whole,fraction]=number.split('.');const tail=fraction?.replace(/0+$/,'');
  return whole.replace(/^0+(?=\d)/,'')+(tail?'.'+tail:'');
 }).replace(/\bper\b/g,'/').replace(/\s+/g,'');
}
function ingredientSet(value:unknown):string[]|null {
 if(!Array.isArray(value)||!value.length||value.length>20)return null;
 const keys=value.map(i=>i&&typeof i.name==='string'&&i.name.length<200&&typeof i.strength==='string'&&i.strength.length<100&&norm(i.name)&&/\d/.test(i.strength)&&/(?:mg|mcg|µg|\bg\b|iu|units|%|mmol)/i.test(i.strength)
  ?norm(i.name)+'|'+strengthKey(i.strength):null);
 if(keys.some(k=>!k)||new Set(keys).size!==keys.length)return null;
 return (keys as string[]).sort();
}
export function exactComposition(origin:Profile,candidate:Profile,animal=false,generic=false):boolean {
 const a=ingredientSet(origin.ingredients),b=ingredientSet(candidate.ingredients);
 if(origin.complete!==true||candidate.complete!==true||!a||!b||JSON.stringify(a)!==JSON.stringify(b))return false;
 if(!norm(origin.form)||!norm(origin.route)||norm(origin.form)!==norm(candidate.form)||norm(origin.route)!==norm(candidate.route))return false;
 if(generic&&candidate.generic!==true)return false;
 if(!Array.isArray(origin.species)||!Array.isArray(candidate.species)||[...origin.species,...candidate.species].some(s=>typeof s!=='string'||!norm(s)))return false;
 if(!animal&&(origin.species.length||candidate.species.length))return false;
 if(animal){if(!origin.species.length)return false;
  const left=origin.species.map(norm).filter(Boolean).sort(),right=candidate.species.map(norm).filter(Boolean).sort();
  if(!left.length||JSON.stringify(left)!==JSON.stringify(right))return false;
 }
 return true;
}
export type OriginProduct={name:string;country:string;form:string;route:string;species:string[];complete:true;generic:boolean;ingredients:{name:string;strength:string}[];sources:string[];lookup?:'original';identification?:'origin-v1';release?:string;excipients?:string[];excipientStatus?:'complete'|'partial'|'unknown'};
export function sourceHintAgrees(hint:unknown,ingredients:OriginProduct['ingredients']){
 const strict=selectedCombinationAgrees(hint,ingredients);if(strict!==false)return strict;
 if(typeof hint!=='string')return null;
 const parts=hint.trim().split(/\s*(?:\+|\/)\s*/);
 const values=ingredients.map(i=>i.strength.match(/^(\d+(?:\.\d+)?)\s*mg\s*(?:(?:per|\/)\s*(?:tablet|capsule))?$/i));
 if(parts.some(p=>!/^\d+(?:\.\d+)?\s*(?:mg)?$/i.test(p))||values.some(v=>!v))return false;
 const remaining=values.map(v=>Number(v![1]));
 return parts.every(p=>{const index=remaining.indexOf(Number.parseFloat(p));if(index<0)return false;remaining.splice(index,1);return true;});
}
function signingKey(){const secret=claudePreviewEnabled()?process.env.ANTHROPIC_API_KEY:process.env.OPENAI_API_KEY_1||process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY_2||process.env.OPENAI_API_KEY_3||process.env.OPENAI_API_KEY_4;if(!secret)throw Error('ORIGIN_SELECTION_UNAVAILABLE');return createHmac('sha256',secret).update('medicea-origin-selection-v1').digest();}
export function issueOriginSelection(profile:OriginProduct,drugName:string){const payload=Buffer.from(JSON.stringify({v:1,expires:Date.now()+15*60_000,drugName,profile})).toString('base64url');return payload+'.'+createHmac('sha256',signingKey()).update(payload).digest('base64url');}
export function readOriginSelection(token:unknown,drugName:string,country:string,dosage:unknown):OriginProduct|null{
 try{if(typeof token!=='string'||token.length>24000)return null;const parts=token.split('.');if(parts.length!==2)return null;const expected=createHmac('sha256',signingKey()).update(parts[0]).digest(),actual=Buffer.from(parts[1],'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());return data.v===1&&Number.isFinite(data.expires)&&data.expires>Date.now()&&norm(data.drugName)===norm(drugName)&&norm(data.profile.country)===norm(country)&&sourceHintAgrees(dosage,data.profile.ingredients)!==false?data.profile:null;
 }catch{return null;}
}
export function identificationHintAgrees(hint:unknown,ingredients:OriginProduct['ingredients']):boolean|null{
 if(typeof hint!=='string'||!hint.trim())return null;
 const parts=hint.trim().split(/\s*(?:\+|\/|,|;)\s*/).map(s=>s.match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|%)?$/i));
 const labels=ingredients.map(i=>i.strength.trim().match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|%)\s*(?:(?:per|\/)\s*(?:tablet|capsule|sachet))?$/i));
 if(parts.some(p=>!p)||labels.some(p=>!p))return null;
 const remaining=labels.map(p=>({amount:Number(p![1]),unit:p![2].toLowerCase()}));
 return parts.every(p=>{const unit=(p![2]||'mg').toLowerCase(),index=remaining.findIndex(v=>v.amount===Number(p![1])&&v.unit===unit);if(index<0)return false;remaining.splice(index,1);return true;});
}
export function cleanMatchText(value:string){
 return value.replace(/&#(?:x([a-f0-9]+)|(\d+));/gi,(raw,hex,decimal)=>{const n=Number.parseInt(hex||decimal,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):raw;})
  .replace(/&nbsp;/gi,' ').replace(/&mdash;/gi,'—').replace(/&ndash;/gi,'–').replace(/&amp;/gi,'&').replace(/\*\*|__/g,'').replace(/\s+/g,' ').trim();
}
export function isEmptyMatchText(value:string){
 const text=cleanMatchText(value);
 return /^(?:no (?:(?:verified|confirmed|exact|matching)\s+)*(?:results?|match(?:es)?|equivalents?|products?)(?:\s+(?:were |could be )?found)?|not found)(?:[.!:…]|$)/i.test(text);
}
export function isSearchSummary(value:string){
 return /^(?:(?:(?:current|live)\s+)?(?:pharmacy\s+)?stock(?:\s+availability)?\s+(?:(?:is|was|has been)\s+)?not\s+(?:verified|confirmed|checked)\b|(?:only|a total of|in total)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(?:matching|verified|confirmed)\s+)*(?:products?|medicines?|matches|results?)\b|(?:both|all|these|the above)\s+(?:(?:matching|listed|identified)\s+)?(?:products|medicines|results)\s+(?:are|were|have|require|contain)\b|(?:note|summary|sources?)\s*[:—])/i.test(cleanMatchText(value));
}
export function isMedicineName(value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>600)return false;
 const name=value.trim();
 return !isEmptyMatchText(name)&&!isSearchSummary(name)&&!/^(?:i(?:['’]m| am) sorry\b|sorry\b|i (?:cannot|can['’]t|am unable|do not have)\b|unable to\b|there (?:are|is) no\b|no (?:exact )?(?:matching )?(?:results?|match(?:es)?|equivalents?|products?)\b|not found\b)/i.test(name)&&!/[<>]/.test(name);
}
