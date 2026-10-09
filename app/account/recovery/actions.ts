'use server';
import {redirect} from 'next/navigation';
import {accountClient,authConfigured} from '@/lib/supabase/server';
import {recoveryEnabled} from '@/lib/recovery-config';

type Result = {error?:string;codes?:string[];remaining?:number};
function providerError(code?:string){
  if(code==='mfa_recovery_codes_enroll_not_enabled'||code==='mfa_recovery_codes_verify_not_enabled') return 'Supabase has recovery codes disabled for this project. Repeating this request will not enable them. The project owner needs to check provider availability; keep your authenticator enabled.';
  if(code==='mfa_recovery_codes_locked'||code==='over_request_rate_limit'||code==='over_email_send_rate_limit') return 'Too many attempts. Wait before trying again, or use your authenticator.';
  if(code==='mfa_verified_factor_exists') return 'Recovery codes already exist. Reload this page to replace them with a new set.';
  if(code==='insufficient_aal') return 'Verify your authenticator on the account page first.';
  return 'Unable to complete recovery. The code may be incorrect or already used. Try again later or contact recovery@medicea.global.';
}

export async function generateRecoveryCodes(replace:boolean,confirmed:boolean):Promise<Result>{
  if(!recoveryEnabled()||!authConfigured()) return {error:'Recovery-code testing is unavailable.'};
  if(typeof replace!=='boolean'||confirmed!==true) return {error:'Confirm that you will save the new codes and replace any old set.'};
  try {
    const client=await accountClient(true);
    const identity=await client.auth.getUser();
    if(identity.error||!identity.data.user) return {error:'Sign in first.'};
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance.error||assurance.data?.currentLevel!=='aal2') return {error:'Verify your authenticator on the account page first.'};
    const result=replace?await client.auth.mfa.recoveryCodes.regenerate():await client.auth.mfa.recoveryCodes.generate({friendlyName:'medicéa recovery codes'});
    if(result.error) return {error:providerError(result.error.code)};
    // Only return codes: never send provider session objects or tokens to the UI.
    if(!result.data?.codes?.length) return {error:'No codes were returned. Reload this page and check their status before trying again.'};
    return {codes:result.data.codes,remaining:result.data.codes.length};
  } catch {return {error:'Account service unavailable. Reload and check code status before retrying.'};}
}

export async function verifyRecoveryCode(code:string):Promise<Result>{
  if(!recoveryEnabled()||!authConfigured()) return {error:'Recovery-code testing is unavailable.'};
  if(typeof code!=='string'||code.length>128||!/^[a-z0-9\s-]{8,128}$/i.test(code)) return {error:'Enter a complete recovery code from your saved set.'};
  try {
    const client=await accountClient(true);
    const identity=await client.auth.getUser();
    if(identity.error||!identity.data.user) return {error:'Sign in with your account email first, then return here.'};
    const result=await client.auth.mfa.recoveryCodes.verify({code:code.trim()});
    if(result.error) return {error:providerError(result.error.code)};
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance.error||assurance.data?.currentLevel!=='aal2') return {error:'Recovery verification could not be confirmed. Return to your account page.'};
  } catch {return {error:'Account service unavailable. Return to the account page to check whether verification completed before retrying.'};}
  redirect('/account');
}
