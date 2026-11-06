import {createSign,createPublicKey,verify} from 'node:crypto';
import {PLAY_PACKAGE,PLAY_PLANS,type PlayPlan} from './play-policy';
let cached:{value:string;expires:number}|undefined;
export async function googleAccessToken(){
 if(cached&&cached.expires>Date.now()+60000)return cached.value;
 const email=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!email||!key)throw Error('Play verification credentials missing');
 const now=Math.floor(Date.now()/1000),encode=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const input=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=createSign('RSA-SHA256').update(input).sign(key,'base64url');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+signature}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 const data=await r.json();if(!r.ok||typeof data.access_token!=='string')throw Error('Google authentication unavailable');
 cached={value:data.access_token,expires:Date.now()+Math.min(Number(data.expires_in)||0,3600)*1000};return cached.value;
}
export async function playRequest(path:string,method='GET'){
 const r=await fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+encodeURIComponent(PLAY_PACKAGE)+path,{method,headers:{Authorization:'Bearer '+await googleAccessToken(),'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!r.ok)throw Error('Play provider unavailable');
 return r.status===204?{}:JSON.parse(await r.text()||'{}');
}
export function purchasePath(plan:PlayPlan,token:string){const p=PLAY_PLANS[plan];return p.type==='inapp'?'/purchases/products/'+encodeURIComponent(p.product)+'/tokens/'+encodeURIComponent(token):'/purchases/subscriptionsv2/tokens/'+encodeURIComponent(token);}
export function fulfillmentPath(plan:PlayPlan,token:string,action:string){return '/purchases/'+(PLAY_PLANS[plan].type==='inapp'?'products':'subscriptions')+'/'+encodeURIComponent(PLAY_PLANS[plan].product)+'/tokens/'+encodeURIComponent(token)+':'+action;}
export async function verifyRtdn(req:Request){
 const jwt=req.headers.get('authorization')?.match(/^Bearer ([\w.-]+)$/)?.[1];if(!jwt||jwt.length>12000)throw Error('Missing identity');
 const parts=jwt.split('.');if(parts.length!==3)throw Error('Invalid identity');
 const header=JSON.parse(Buffer.from(parts[0],'base64url').toString()),claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
 const now=Math.floor(Date.now()/1000);
 if(header.alg!=='RS256'||!header.kid||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!process.env.GOOGLE_PLAY_RTDN_AUDIENCE||!process.env.GOOGLE_PLAY_RTDN_EMAIL||claims.aud!==process.env.GOOGLE_PLAY_RTDN_AUDIENCE||claims.email!==process.env.GOOGLE_PLAY_RTDN_EMAIL||claims.email_verified!==true||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+60||claims.iat<now-3600)throw Error('Invalid identity');
 const r=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error('Identity service unavailable');
 const jwks=await r.json();const jwk=jwks.keys?.find((k:any)=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256');
 if(!jwk||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('Invalid signature');
}
