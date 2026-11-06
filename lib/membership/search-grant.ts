import {createHmac,timingSafeEqual} from 'node:crypto';
type Grant={version:1;member:string;kind:'leaflet'|'information';medicines:{name:string;country:string}[]};
function key() {
 const dedicated=process.env.MEDICEA_SEARCH_ACCESS_SECRET;
 // Preserve existing Stripe preview permissions until an explicit key migration.
 // An invalid explicit key must fail closed rather than silently fall back.
 const legacy=process.env.STRIPE_WEBHOOK_SECRET;
 const secret=dedicated??legacy??process.env.GOOGLE_PLAY_ACCOUNT_SECRET;
 const usingLegacy=dedicated===undefined&&legacy!==undefined;
 if(!secret || (usingLegacy?!secret.startsWith('whsec_'):secret.trim()!==secret||secret.length<32))
  throw Error('Search access signing is not configured');
 // Purpose-derived server key; neither secret is sent to clients.
 return createHmac('sha256',secret).update('medicea-completed-search-leaflets-v1').digest();
}
export function searchGrantConfigured(){key();}
function normal(value:unknown){return typeof value==='string'?value.trim().toLowerCase():'';}
export function issueSearchGrant(member:string,input:any,result:any) {
 const mode=input.mode||'international';
 const country=mode==='generic'||mode==='pet-generic'?input.originCountry:input.targetCountry||input.originCountry;
 const names=Array.isArray(result.matches)?result.matches.map((m:any)=>m?.medicine_name??m?.Medicine_name):
  String(result.equivalentResults?.raw_text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
   .map(line=>line.replace(/^(?:\d+[.)]|[-•*])\s*/,'').replace(/\s*[;,.]$/,'').trim());
 const medicines=names.filter((name:unknown)=>typeof name==='string'&&!!name.trim()).slice(0,30).map((name:string)=>({name:normal(name),country:normal(country)}));
 if(mode==='pets'||mode==='pet-generic')medicines.push({name:normal(input.drugName),country:normal(input.originCountry)});
 const grant:Grant={version:1,member,kind:mode==='pets'||mode==='pet-generic'?'information':'leaflet',medicines};
 const payload=Buffer.from(JSON.stringify(grant)).toString('base64url');
 return payload+'.'+createHmac('sha256',key()).update(payload).digest('base64url');
}
export function allowsSearchFollowup(token:unknown,member:string,kind:string,input:any) {
 if(typeof token!=='string'||token.length>24000)return false;
 const parts=token.split('.');if(parts.length!==2)return false;
 const expected=createHmac('sha256',key()).update(parts[0]).digest();
 const signature=Buffer.from(parts[1],'base64url');
 if(signature.length!==expected.length||!timingSafeEqual(signature,expected))return false;
 try {
  const grant:Grant=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  return grant.version===1&&grant.member===member&&grant.kind===kind&&Array.isArray(grant.medicines)&&
   grant.medicines.some(m=>m.name===normal(input.drugName)&&m.country===normal(input.originCountry));
 }catch{return false;}
}
