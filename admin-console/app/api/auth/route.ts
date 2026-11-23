import {consoleAuth,ownerSession} from '../../../lib/auth';
import {assertEnabled,ConsoleError,sameOrigin,memberId} from '../../../lib/policy';
import {failure,json} from '../../../lib/http';
export async function GET(){try{
 const {client,user}=await ownerSession(false);const result=await client.auth.getClaims();
 let ready=false;try{const {requireMfa}=await import('../../../lib/policy');requireMfa(result.data?.claims,user);ready=true;}catch{}
 const factors=await client.auth.mfa.listFactors();if(factors.error)throw new ConsoleError('AUTH_UNAVAILABLE',503);
 const verified=factors.data.totp.filter(f=>f.status==='verified').map(f=>({id:f.id,name:f.friendly_name||'Authenticator'}));
 return json({step:ready?'ready':verified.length?'mfa':'enroll',email:user.email,factors:verified});
}catch(error){return failure(error);}}
export async function POST(req:Request){try{
 assertEnabled();sameOrigin(req);const body=await req.json(),client=await consoleAuth();
 const email=process.env.MEDICEA_CONSOLE_OWNER_EMAIL?.trim().toLowerCase();if(!email)throw new ConsoleError('AUTH_UNAVAILABLE',503);
 if(body.action==='send_code'){
  if(body.email?.trim().toLowerCase()!==email)throw new ConsoleError('OWNER_REQUIRED',403);
  const result=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false}});if(result.error)throw new ConsoleError('CODE_UNAVAILABLE',429);return json({sent:true});
 }
 if(body.action==='verify_code'){
  if(typeof body.code!=='string'||!/^\d{6,8}$/.test(body.code))throw new ConsoleError('INVALID_CODE');
  const result=await client.auth.verifyOtp({email,token:body.code,type:'email'});if(result.error)throw new ConsoleError('INVALID_CODE');return json({signedIn:true});
 }
 const owner=await ownerSession(false);
 if(body.action==='sign_out'){await owner.client.auth.signOut({scope:'local'});return json({signedOut:true});}
 if(body.action==='enroll'){
  const factors=await owner.client.auth.mfa.listFactors();if(factors.error||factors.data.totp.some(f=>f.status==='verified'))throw new ConsoleError('USE_EXISTING_AUTHENTICATOR',403);
  // Remove only abandoned, unverified console enrollment attempts for this owner.
  for(const factor of factors.data.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='medicéa owner console'))await owner.client.auth.mfa.unenroll({factorId:factor.id});
  const result=await owner.client.auth.mfa.enroll({factorType:'totp',friendlyName:'medicéa owner console',issuer:'medicéa owner console'});
  if(result.error||result.data.type!=='totp')throw new ConsoleError('ENROLLMENT_UNAVAILABLE',503);
  return json({factor:result.data.id,qr:result.data.totp.qr_code});
 }
 if(body.action==='mfa'){
  const factor=memberId(body.factor);if(typeof body.code!=='string'||!/^\d{6}$/.test(body.code))throw new ConsoleError('INVALID_CODE');
  const factors=await owner.client.auth.mfa.listFactors();if(factors.error||!factors.data.all.some(f=>f.id===factor&&f.factor_type==='totp'))throw new ConsoleError('INVALID_FACTOR',403);
  const challenge=await owner.client.auth.mfa.challenge({factorId:factor});if(challenge.error)throw new ConsoleError('INVALID_CODE');
  const result=await owner.client.auth.mfa.verify({factorId:factor,challengeId:challenge.data.id,code:body.code});if(result.error)throw new ConsoleError('INVALID_CODE');return json({verified:true});
 }
 throw new ConsoleError('INVALID_ACTION');
}catch(error){return failure(error);}}
