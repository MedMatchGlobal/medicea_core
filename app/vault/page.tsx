import Link from 'next/link';
import { redirect } from 'next/navigation';
import { vaultAccess } from '@/lib/vault-access';
import { DeleteButton, UploadForm } from './VaultForms';
import { MedicineForm, RemoveMedicineButton } from './MedicineForms';
import styles from '../account/account.module.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private beta vault · medicéa', robots: { index: false, follow: false } };

export default async function VaultPage() {
  const access = await vaultAccess();
  if (!access.ok && access.reason !== 'disabled') redirect('/account');
  if (!access.ok) return <main className={styles.page}><section className={styles.card}><h1>Private vault setup</h1><p>The private beta is not enabled yet. The public health preview continues to use fictional data.</p><Link href="/account">My account</Link></section></main>;
  const records = await access.client.from('vault_beta_documents').select('id,title,mime_type,size_bytes,created_at').eq('user_id', access.user.id).order('created_at', {ascending:false}).limit(100);
  const medicines = await access.client.from('vault_beta_medicines').select('id,name,strength,notes').eq('user_id', access.user.id).order('created_at', {ascending:false}).limit(100);
  return <main className={styles.page}><section className={styles.card}>
    <Link href="/"><img src="/logo.png" width={165} alt="medicéa" /></Link>
    <span className={styles.eyebrow}>PRIVATE BETA · FICTIONAL DATA ONLY</span><h1>Your private test vault.</h1>
    <p>Signed in with two-factor authentication as <strong>{access.user.email}</strong>.</p>
    <p className={styles.notice}>Use fictional files only while we verify storage, access and recovery. Real health records, AI interpretation, profiles and appointments are not enabled here.</p>
    <h2>My test medicines</h2>
    {medicines.error ? <p role="alert">Your medicine list is unavailable. Private storage setup must be completed before saving medicines.</p> : <>
      <MedicineForm />
      {!medicines.data?.length && <p>Your medicine list is empty.</p>}
      {medicines.data?.map(medicine => <section key={medicine.id} style={{borderTop:'1px solid #dce5f2',paddingTop:16}}>
        <h3>{medicine.name}</h3>{medicine.strength && <p>{medicine.strength}</p>}{medicine.notes && <p style={{whiteSpace:'pre-wrap'}}>{medicine.notes}</p>}
        <RemoveMedicineButton id={medicine.id} />
      </section>)}
    </>}
    {records.error ? <p role="alert">Private storage setup is incomplete or unavailable. No documents can be listed. Please try again after setup.</p> : <><h2>Add a test document</h2><UploadForm /><h2>My test documents</h2>{!records.data?.length && <p>Your vault is empty. No sample records are mixed with your uploads.</p>}{records.data?.map(record => <section key={record.id} style={{borderTop:'1px solid #dce5f2',paddingTop:16}}><h3>{record.title}</h3><p>{new Date(record.created_at).toLocaleDateString('en-GB')} · {Math.ceil(record.size_bytes/1024)} KB</p><a href={`/vault/documents/${record.id}`}>Download original file</a><DeleteButton id={record.id} /></section>)}</>}
    <Link className={styles.back} href="/account">Account & authenticator</Link>
  </section></main>;
}
