import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
export const TRAVEL_TEST_COOKIE='medicea_travel_test';
const secret=()=>process.env.MEDICEA_TRAVEL_TEST_ACCESS_CODE||'';
export function travelTestConfigured(){return secret().length>=24;}
export function correctTravelTestCode(value:unknown){if(typeof value!=='string'||value.length>200||!travelTestConfigured())return false;const a=Buffer.from(value),b=Buffer.from(secret());return a.length===b.length&&timingSafeEqual(a,b);}
function signature(value:string){return createHmac('sha256',secret()).update('travel-connected-session-v1:'+value).digest('base64url');}
export function issueTravelTestSession(now=Date.now()){if(!travelTestConfigured())throw Error('TEST_SETUP');const value=(now+8*3600000)+'.'+randomUUID();return value+'.'+signature(value);}
export function travelTestSession(request:Request,now=Date.now()){
 if(!travelTestConfigured())return false;
 try{const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(TRAVEL_TEST_COOKIE+'='))?.slice(TRAVEL_TEST_COOKIE.length+1);if(!token||token.length>200)return false;const parts=token.split('.');if(parts.length!==3||!/^\d+$/.test(parts[0])||Number(parts[0])<=now||Number(parts[0])>now+8*3600000)return false;const expected=Buffer.from(signature(parts[0]+'.'+parts[1])),actual=Buffer.from(parts[2]);return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}
}
