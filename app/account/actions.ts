'use server';
import { redirect } from 'next/navigation';
import { accountClient, authConfigured } from '@/lib/supabase/server';

export type AccountResult = { error?: string; sent?: boolean };
const emailValid = (email:string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function sendCode(email:string): Promise<AccountResult> {
  if (!authConfigured()) return {error:'Account setup is not connected yet.'};
  if (!emailValid(email)) return {error:'Enter a valid email address.'};
  const client = await accountClient();
  const {error} = await client.auth.signInWithOtp({email, options:{shouldCreateUser:true}});
  if (error) return {error:'Unable to send a code. Please wait and try again.'};
  return {sent:true};
}

export async function verifyCode(email:string, token:string): Promise<AccountResult> {
  if (!authConfigured() || !emailValid(email) || !/^\d{6,10}$/.test(token)) return {error:'Enter the email and verification code from your message.'};
  const client = await accountClient();
  const {error} = await client.auth.verifyOtp({email,token,type:'email'});
  if (error) return {error:'The code has expired or is incorrect. Request a new code and try again.'};
  redirect('/account');
}

export async function signOut() {
  const client = await accountClient();
  const {error} = await client.auth.signOut({scope:'global'});
  if (error) throw new Error('Sign-out failed. Please try again.');
  redirect('/account');
}

export async function beginMfa(backup=false) {
  if(typeof backup!=='boolean') return {error:'Invalid authenticator setup request.'};
  const client = await accountClient();
  const {data:{user},error:identityError} = await client.auth.getUser();
  if (identityError||!user) return {error:'Sign in before adding two-factor authentication.'};
  const {data:factors,error:listError} = await client.auth.mfa.listFactors();
  if (listError) return {error:'Unable to load authentication settings.'};
  const verified=factors.totp.filter(f=>f.status==='verified');
  if(backup){
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance.error||assurance.data?.currentLevel!=='aal2'||!verified.length) return {error:'Verify your existing authenticator before adding a backup.'};
    if(verified.length>=2) return {error:'A backup authenticator is already enrolled.'};
  }else if(verified.length) return {error:'An authenticator is already enabled.'};
  // Remove only unfinished enrolments so an abandoned setup can be retried.
  for (const factor of factors.all.filter(f=>f.factor_type==='totp' && f.status==='unverified')) {
    const cleanup=await client.auth.mfa.unenroll({factorId:factor.id});
    if(cleanup.error) return {error:'Unable to clear unfinished authenticator setup. Try again later.'};
  }
  const {data,error} = await client.auth.mfa.enroll({factorType:'totp',issuer:'medicéa',friendlyName:backup?'Backup authenticator':'My authenticator'});
  if (error) return {error:'Unable to start authenticator setup.'};
  return {id:data.id,qr:data.totp.qr_code};
}

export async function verifyMfa(factorId:string,code:string):Promise<AccountResult> {
  if (!/^\d{6}$/.test(code)) return {error:'Enter the six-digit authenticator code.'};
  const client = await accountClient();
  const {data:{user}} = await client.auth.getUser();
  if (!user) return {error:'Please sign in again.'};
  const {error} = await client.auth.mfa.challengeAndVerify({factorId,code});
  if (error) return {error:'The authenticator code is incorrect or expired.'};
  redirect('/account');
}
