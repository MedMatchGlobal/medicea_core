import { HealthText } from '@/app/health-i18n/HealthLanguage';
import Link from 'next/link';
import {accountClient,authConfigured} from '@/lib/supabase/server';
import {SignInForm,MfaForm} from './AccountForms';
import MfaChallenge from './MfaChallenge';
import {signOut} from './actions';
import styles from './account.module.css';
import {vaultEnabled} from '@/lib/vault-access';
export const dynamic='force-dynamic';
export const metadata={title:'Your account · medicéa',robots:{index:false,follow:false}};

export default async function AccountPage(){
  const enabled=authConfigured();
  const client=enabled?await accountClient():null;
  const user=client?(await client.auth.getUser()).data.user:null;
  const factorResult=user&&client?await client.auth.mfa.listFactors():null;
  if (factorResult?.error) throw new Error('Unable to verify account security settings. Please try again.');
  const factors=factorResult?.data;
  const verifiedFactors=factors?.totp.filter(f=>f.status==='verified')||[];
  const factor=verifiedFactors[0];
  const assurance=user&&client?(await client.auth.mfa.getAuthenticatorAssuranceLevel()).data:null;
  const needsMfa=Boolean(factor&&assurance?.currentLevel!=='aal2');
  return <main className={styles.page}><section className={styles.card}>
    <Link href="/"><img src="/logo.png" alt="medicéa" width={165}/></Link>
    <span className={styles.eyebrow}><HealthText text={"YOUR PERSONAL ACCOUNT"} /></span>
    <h1>{user?<HealthText text={"Your account, protected."} />:<HealthText text={"A private space starts with you."} />}</h1>
    {!enabled&&<p className={styles.notice}><HealthText text={"Account setup is awaiting connection. Sign-in is disabled until the managed account service is configured."} /></p>}
    {!user?<><p><HealthText text={"Sign in or create an account with an email verification code."} /></p><SignInForm enabled={enabled}/></>:<>
      <p><HealthText text={"Signed in as "} /><strong><bdi>{user.email}</bdi></strong></p>
      {needsMfa?<><h2><HealthText text={"Confirm it’s you"} /></h2><p><HealthText text={"Enter your authenticator code to finish signing in."} /></p><MfaChallenge factors={verifiedFactors.map(f=>({id:f.id,name:f.friendly_name||'My authenticator'}))}/></>:<><h2><HealthText text={"Two-factor authentication"} /></h2>{factor?<p><HealthText text={"Your authenticator is enabled and verified for this session."} /></p>:<><p><HealthText text={"Add an authenticator for an extra check when you sign in."} /></p><MfaForm/></>}</>}
      {factor&&!needsMfa&&<><h2><HealthText text={"Backup authenticator"} /></h2>{verifiedFactors.length<2?<><p><HealthText text={"Add a backup on a separate device so you can still sign in if you lose your phone. Keep the setup QR code private."} /></p><MfaForm backup/></>:<p><HealthText text="You have {count} verified authenticators. At your next sign-in, choose whichever one you can access." values={{count:verifiedFactors.length}} /></p>}</>}
      <p className={styles.notice}><HealthText text={"The private beta supports fictional medicine entries and documents while we verify access and account recovery. Please do not upload real health records yet."} /></p>
      {vaultEnabled()&&<Link className={styles.back} href="/vault"><HealthText text={"Open private beta vault · fictional data only →"} /></Link>}
      <form action={signOut}><button className={styles.signout}><HealthText text={"Sign out of all sessions"} /></button></form>
      <small><HealthText text={"Email sign-in does not bypass two-factor authentication."} /></small>
    </>}
    <Link className={styles.back} href="/account/recovery"><HealthText text={"Lost your authenticator? Get help →"} /></Link>
    <Link className={styles.back} href="/"><HealthText text={"Back to medicine search →"} /></Link>
  </section></main>;
}
