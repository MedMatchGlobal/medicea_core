'use client';
import { useRef, useState, useTransition } from 'react';
import { deleteDocument, uploadDocument } from './actions';
import styles from '../account/account.module.css';

export function UploadForm() {
  const form = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return <form ref={form} className={styles.form} onSubmit={event => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    start(async () => { try { const result = await uploadDocument(values); setError(Boolean(result.error)); setMessage(result.error || result.success || ''); if (result.success) form.current?.reset(); } catch { setError(true); setMessage('Unable to upload. Please try again.'); } });
  }}>
    <label>Document title<input name="title" required maxLength={120} disabled={pending} placeholder="Example test report" /></label>
    <label>Test document<input name="document" type="file" required accept="application/pdf,image/jpeg,image/png" disabled={pending} /></label>
    <small>PDF, JPEG or PNG, up to 3 MB. Downloads are attachments; files are not rendered or sent to AI.</small>
    <label><span><input style={{width:'auto'}} type="checkbox" name="fictional" value="yes" required disabled={pending} /> This file contains fictional test data only.</span></label>
    <button disabled={pending}>{pending ? 'Uploading…' : 'Upload test document'}</button>
    {message && <p role={error ? 'alert' : 'status'}>{message}</p>}
  </form>;
}
export function DeleteButton({id}:{id:string}) {
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return <div className={styles.form}>{!confirm ? <button className={styles.secondary} onClick={() => setConfirm(true)}>Delete</button> : <><p>Delete this test document permanently?</p><button disabled={pending} onClick={() => start(async () => { try { const result = await deleteDocument(id); setMessage(result.error || result.success || ''); setConfirm(false); } catch { setMessage('Deletion failed. Please try again.'); } })}>{pending ? 'Deleting…' : 'Confirm deletion'}</button><button className={styles.secondary} disabled={pending} onClick={() => setConfirm(false)}>Cancel</button></>}{message && <p role="status">{message}</p>}</div>;
}
