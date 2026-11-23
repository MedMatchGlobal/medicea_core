'use client';
import {useEffect,useRef} from 'react';
import styles from './membership.module.css';

export default function CancelPlanDialog({busy,error,onConfirm,onClose}:{busy:boolean;error?:string;onConfirm:()=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),keep=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const element=dialog.current,previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  element?.showModal();keep.current?.focus();document.body.style.overflow='hidden';
  return()=>{element?.close();document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 return <dialog ref={dialog} className={styles.cancelPlanDialog} aria-labelledby="cancel-plan-heading" aria-describedby="cancel-plan-description" aria-busy={busy} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <h2 id="cancel-plan-heading">Cancel your scheduled upgrade?</h2>
  <p id="cancel-plan-description">Your scheduled upgrade will not start, and you will not be charged for it. Your current paid access and saved searches will stay in place.</p>
  {error&&<p role="alert" className={styles.authError}>{error}</p>}
  <div className={styles.cancelPlanActions}>
   <button ref={keep} type="button" className={styles.primary} disabled={busy} onClick={onClose}>Keep scheduled upgrade</button>
   <button type="button" className={styles.cancelPlanConfirm} disabled={busy} onClick={onConfirm}>{busy?'Cancelling…':'Yes, cancel scheduled upgrade'}</button>
  </div>
 </dialog>;
}
