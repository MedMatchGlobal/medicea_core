import Link from 'next/link';
import styles from '../account.module.css';
import {accountClient,authConfigured} from '@/lib/supabase/server';
import {recoveryEnabled} from '@/lib/recovery-config';
import {RecoveryForms} from './RecoveryForms';

export const dynamic='force-dynamic';
export const metadata={title:'Authenticator help · medicéa',robots:{index:false,follow:false}};

export default async function RecoveryPage(){
  const enabled=recoveryEnabled()&&authConfigured();
  const client=enabled?await accountClient(true):null;
  const user=client?(await client.auth.getUser()).data.user:null;
  const assurance=user&&client?await client.auth.mfa.getAuthenticatorAssuranceLevel():null;
  let status:{exists:boolean;remaining:number|null;statusError?:string}={exists:false,remaining:null};
  if(user&&client){
    try{
      const result=await client.auth.mfa.recoveryCodes.getStatus();
      if(result.data)status={exists:true,remaining:result.data.remaining};
      else if(result.error?.code!=='mfa_factor_not_found')status={exists:false,remaining:null,statusError:'Recovery-code status is unavailable from the account provider. Contact recovery@medicea.global; do not replace your authenticator.'};
    }catch{status.statusError='Account service unavailable. Try again later.';}
  }
  return <main className={styles.page}><section className={styles.card}>
    <Link href="/"><img src="/logo.png" alt="medicéa" width={165}/></Link>
    <span className={styles.eyebrow}>ACCOUNT ACCESS</span>
    <h1>Lost your authenticator?</h1>
    <p>You need your authenticator code to open your private vault. Signing in with an email code alone keeps your documents locked.</p>
    {!enabled&&<p className={styles.notice}>Recovery-code generation is disabled for this project. You can prepare a backup authenticator from your account page while your current authenticator works.</p>}
    {enabled&&<>
      <p className={styles.notice}>Recovery-code testing is available in this local beta. Use a disposable test account first. Keep codes private; do not include them in screenshots.</p>
      {user?<><p>Signed in as <strong>{user.email}</strong></p><RecoveryForms verified={!assurance?.error&&assurance?.data?.currentLevel==='aal2'} {...status}/></>:<p><Link href="/account">Sign in with your email</Link>, then return here to use a saved recovery code. An authenticator check is required to generate a set.</p>}
    </>}
    <h2>If you still have your old phone</h2>
    <p>Check whether your authenticator app still has your medicéa entry. If it does, use its current six-digit code on the account page.</p>
    <h2>If you have an authenticator backup</h2>
    <p>If you enrolled a separate backup authenticator, return to the account page, choose it from the authenticator list, and enter its current six-digit code. If you have an app backup instead, follow that app’s official restore instructions first.</p>
    <h2>If you cannot restore it</h2>
    <p className={styles.notice}>If you cannot restore your authenticator and have no usable recovery code, assisted authenticator reset is not available in this test beta yet.</p>
    <p>For recovery enquiries, contact <a href="mailto:recovery@medicea.global?subject=Authenticator%20recovery%20enquiry">recovery@medicea.global</a>. You can describe the access problem, but a reset cannot be promised until ownership verification is available.</p>
    <p>Keep your account email address and any remaining authenticator access. Creating a different account will not give you access to this account’s documents.</p>
    <p>Never send anyone your sign-in codes, authenticator setup QR code, secret key, or health documents to recover access.</p>
    <Link className={styles.back} href="/account">Back to your account →</Link>
  </section></main>;
}
