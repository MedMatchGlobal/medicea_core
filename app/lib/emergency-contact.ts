// The emergency contact lives only on this device (localStorage). It is never sent to our servers.
export type EmergencyContact={name:string;number:string};
const KEY='medicea.emergencyContact.v1';
// Digits with an optional leading +; spaces, dashes and brackets are dropped. 6-16 digits.
export function cleanNumber(value:unknown):string{
 if(typeof value!=='string')return '';
 const text=value.trim();const plus=text.startsWith('+')?'+':'';
 const digits=text.replace(/\D/g,'');
 return digits.length>=6&&digits.length<=16?plus+digits:'';
}
export function cleanContact(value:unknown):EmergencyContact|null{
 const v:any=value;const number=cleanNumber(v?.number);
 const name=typeof v?.name==='string'?v.name.replace(/[<>]/g,'').trim().slice(0,60):'';
 return number?{name,number}:null;
}
export function loadEmergencyContact():EmergencyContact|null{
 try{const raw=localStorage.getItem(KEY);return raw?cleanContact(JSON.parse(raw)):null;}catch{return null;}
}
export function saveEmergencyContact(contact:EmergencyContact|null):boolean{
 try{if(!contact){localStorage.removeItem(KEY);return true;}const clean=cleanContact(contact);if(!clean)return false;localStorage.setItem(KEY,JSON.stringify(clean));return true;}catch{return false;}
}
export function mapsLink(latitude:number,longitude:number):string{
 return `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
// Opens the messaging app with the text already written; the person taps send.
export function smsHref(number:string,message:string):string{
 return `sms:${cleanNumber(number)}?&body=${encodeURIComponent(message)}`;
}
// Contact Picker API: Android Chrome only. Returns null when unsupported or cancelled.
export function pickerSupported():boolean{
 return typeof navigator!=='undefined'&&'contacts' in navigator&&typeof (navigator as any).contacts?.select==='function';
}
export async function pickContact():Promise<EmergencyContact|null>{
 try{
  const picked=await (navigator as any).contacts.select(['name','tel'],{multiple:false});
  const first=picked?.[0];if(!first)return null;
  return cleanContact({name:Array.isArray(first.name)?first.name[0]:'',number:Array.isArray(first.tel)?first.tel[0]:''});
 }catch{return null;}
}
