import {notFound} from 'next/navigation';
import {vaultEnabled} from '@/lib/vault-access';
import ProbeForm from './ProbeForm';
import styles from '../../account/account.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'Local storage security checks',robots:{index:false,follow:false}};
export default function SecurityCheckPage(){
  if(process.env.NODE_ENV!=='development'||!vaultEnabled())notFound();
  return <main className={styles.page}><section className={styles.card}><h1>Storage security checks</h1><p>Local development only. These checks call Supabase Storage directly with your session or the anonymous publishable key, without the vault page’s MFA gate. No administrator key is used.</p><p className={styles.notice}>Tests only touch disposable security-check files created here. Copy the test path between sessions. Keep the probe until the owner, anonymous, second-account and email-only checks finish; then remove it using the owner account.</p><ProbeForm/><a href="/account">Account & authenticator</a></section></main>;
}
