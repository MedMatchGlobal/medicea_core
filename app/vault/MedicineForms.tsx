'use client';
import { HealthText, useHealthText } from '@/app/health-i18n/HealthLanguage';

import { useRef, useState, useTransition } from 'react';
import { saveMedicine, removeMedicine } from './medicine-actions';
import styles from '../account/account.module.css';

export function MedicineForm() {
  const tr = useHealthText();
  const form = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return <form ref={form} className={styles.form} onSubmit={event => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    start(async () => {
      try { const result = await saveMedicine(values); setError(Boolean(result.error)); setMessage(result.error || result.success || ''); if (result.success) form.current?.reset(); }
      catch { setError(true); setMessage('Unable to save. Please try again.'); }
    });
  }}>
    <label><HealthText text={"Medicine name"} /><input name="name" required maxLength={120} disabled={pending} placeholder={tr("Example test medicine")} /></label>
    <label><HealthText text={"Strength (optional)"} /><input name="strength" maxLength={80} disabled={pending} placeholder={tr("As written on the packaging")} /></label>
    <label><HealthText text={"Notes (optional)"} /><textarea name="notes" maxLength={500} rows={3} disabled={pending} /></label>
    <label><span><input style={{width:'auto'}} type="checkbox" name="fictional" value="yes" required disabled={pending} /> <HealthText text={"This entry contains fictional test data only."} /></span></label>
    <button disabled={pending}>{pending ? <HealthText text={"Saving…"} /> : <HealthText text={"Save test medicine"} />}</button>
    {message && <p role={error ? 'alert' : 'status'}>{<HealthText text={message} />}</p>}
  </form>;
}

export function RemoveMedicineButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return <div className={styles.form}>
    {!confirm ? <button className={styles.secondary} onClick={() => setConfirm(true)}><HealthText text={"Remove medicine"} /></button> : <>
      <p><HealthText text={"Remove this test medicine from your list?"} /></p>
      <button disabled={pending} onClick={() => start(async () => {
        try { const result = await removeMedicine(id); setMessage(result.error || result.success || ''); setConfirm(false); }
        catch { setMessage('Removal failed. Please try again.'); }
      })}>{pending ? <HealthText text={"Removing…"} /> : <HealthText text={"Confirm removal"} />}</button>
      <button className={styles.secondary} disabled={pending} onClick={() => setConfirm(false)}><HealthText text={"Cancel"} /></button>
    </>}
    {message && <p role="status">{<HealthText text={message} />}</p>}
  </div>;
}
