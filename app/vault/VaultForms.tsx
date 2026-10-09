'use client';
import { HealthText, useHealthText } from '@/app/health-i18n/HealthLanguage';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Upload } from 'tus-js-client';
import { beginDocument, cancelDocument, deleteDocument, finishDocument } from './actions';
import { documentTransfer } from '@/lib/vault-transfer';
import { documentType, MAX_FILE_BYTES } from '@/lib/vault-files';
import styles from '../account/account.module.css';

export function UploadForm() {
  const tr=useHealthText();
  const form=useRef<HTMLFormElement>(null);
  const transfer=useRef<Upload|null>(null);
  const reservation=useRef<{id:string;user_id:string}|null>(null);
  const stop=useRef(false);
  const rejectTransfer=useRef<((error:Error)=>void)|null>(null);
  const input=useRef<FormData|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState(false);
  const [pending,setPending]=useState(false);
  const [progress,setProgress]=useState(0);
  useEffect(()=>()=>{stop.current=true;rejectTransfer.current?.(Error('Cancelled'));void transfer.current?.abort();},[]);
  async function cancel() {
    stop.current=true;await transfer.current?.abort();rejectTransfer.current?.(Error('Cancelled'));
    if(reservation.current) {const result=await cancelDocument(reservation.current.id);setError(Boolean(result.error));setMessage(result.error || '');if(result.error){setPending(false);return;}}
    transfer.current=null;reservation.current=null;input.current=null;setPending(false);setProgress(0);
  }
  async function submit() {
    setPending(true);stop.current=false;setMessage('');setError(false);
    try {
      const values=input.current ?? new FormData(form.current!);input.current=values;const file=values.get('document');
      if(!(file instanceof File) || file.size<1 || file.size>MAX_FILE_BYTES) throw Error('Choose a PDF, JPEG or PNG up to 50 MB.');
      const type=documentType(new Uint8Array(await file.slice(0,16).arrayBuffer()));
      if(!type) throw Error('The file must be a PDF, JPEG or PNG. Renaming a file is not enough.');
      const client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      if(!transfer.current) {
        const result=await beginDocument({title:String(values.get('title')??''),size:file.size,mime:type.mime,fictional:values.get('fictional')==='yes'});
        if(result.error || !result.intake) throw Error(result.error || 'Unable to upload. Please try again.');
        if(stop.current){await cancelDocument(result.intake.id);return;}
        reservation.current=result.intake;
        transfer.current=documentTransfer(client,file,result.intake,setProgress,()=>stop.current);
      }
      await new Promise<void>((resolve,reject)=>{
        rejectTransfer.current=reject;
        transfer.current!.options.onError=()=>reject(Error('Unable to upload. Please try again.'));
        transfer.current!.options.onSuccess=()=>resolve();transfer.current!.start();
      });
      if(stop.current) return;
      const completed=await finishDocument(reservation.current!.id);
      if(completed.error) throw Error(completed.error);
      setMessage(completed.success||'');form.current?.reset();input.current=null;transfer.current=null;reservation.current=null;setProgress(0);
    } catch(problem) {if(!stop.current){setError(true);setMessage(problem instanceof Error?problem.message:'Unable to upload. Please try again.');}}
    finally {if(!reservation.current)input.current=null;if(!stop.current)setPending(false);}
  }
  return <form ref={form} className={styles.form} onSubmit={event=>{event.preventDefault();void submit();}}>
    <label><HealthText text={"Document title"} /><input name="title" required maxLength={120} disabled={pending||Boolean(reservation.current)} placeholder={tr("Example test report")} /></label>
    <label><HealthText text={"Test document"} /><input name="document" type="file" required accept="application/pdf,image/jpeg,image/png" disabled={pending||Boolean(reservation.current)} /></label>
    <small><HealthText text={"PDF, JPEG or PNG, up to 50 MB. Downloads are attachments; files are not rendered or sent to AI."} /></small>
    <label><span><input style={{width:'auto'}} type="checkbox" name="fictional" value="yes" required disabled={pending||Boolean(reservation.current)} /> <HealthText text={"This file contains fictional test data only."} /></span></label>
    <button disabled={pending}>{pending?<HealthText text={"Uploading…"}/>:<HealthText text={"Upload test document"}/>}</button>
    {reservation.current && <><progress aria-label={tr('Uploading…')} max={100} value={progress}/><span>{progress}%</span><button type="button" className={styles.secondary} onClick={()=>void cancel()}><HealthText text={"Cancel"}/></button></>}
    {message && <p role={error?'alert':'status'}><HealthText text={message}/></p>}
  </form>;
}
export function DeleteButton({id}:{id:string}) {
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return <div className={styles.form}>{!confirm ? <button className={styles.secondary} onClick={() => setConfirm(true)}><HealthText text={"Delete"} /></button> : <><p><HealthText text={"Delete this test document permanently?"} /></p><button disabled={pending} onClick={() => start(async () => { try { const result = await deleteDocument(id); setMessage(result.error || result.success || ''); setConfirm(false); } catch { setMessage('Deletion failed. Please try again.'); } })}>{pending ? <HealthText text={"Deleting…"} /> : <HealthText text={"Confirm deletion"} />}</button><button className={styles.secondary} disabled={pending} onClick={() => setConfirm(false)}><HealthText text={"Cancel"} /></button></>}{message && <p role="status">{<HealthText text={message} />}</p>}</div>;
}
