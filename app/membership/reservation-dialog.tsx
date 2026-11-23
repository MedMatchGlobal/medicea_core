'use client';
import {useEffect,useRef,useState} from 'react';
import type {BillingCurrency,PersonalPlan} from '@/lib/membership/config';
import {useMembershipCopy} from '../i18n/membership';
import styles from './membership.module.css';
export type ReservationQuote={plan:PersonalPlan;currency:BillingCurrency;amountMinor:number;startsAt:string};
export default function ReservationDialog({quote,busy,onConfirm,onClose}:{quote:ReservationQuote;busy:boolean;onConfirm:()=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),[consent,setConsent]=useState(false);
  const {copy,lang}=useMembershipCopy(),locale=lang==='en'?'en-GB':lang;
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  const amount=new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(quote.amountMinor/100);
  const date=new Date(quote.startsAt).toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'});
  return <dialog ref={dialog} className={styles.reservationDialog} aria-labelledby="reservation-heading" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <h2 id="reservation-heading">Reserve {copy[quote.plan]}</h2>
    <p>Your current access continues until {date}. Your new plan starts after it ends.</p>
    <p><strong>Charge now: <bdi>{new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(0)}</bdi></strong></p>
    <p>Future payment: <strong><bdi>{amount}</bdi></strong> on or after {date}.</p>
    <p>{quote.plan.startsWith('pass')?`${quote.plan==='pass7'?copy.ends7:quote.plan==='pass14'?copy.ends14:copy.ends30} No renewal or trial.`:quote.plan==='monthly'?copy.monthlyRenewal:copy.annualRenewal}</p>
    <label className={styles.reservationConsent}><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>I authorise this future payment using the card I save in Stripe. I can cancel the reservation before it starts.</span></label>
    <p className={styles.small}>Saved searches stay in place when a plan expires or changes.</p>
    <div className={styles.reservationActions}><button type="button" className={styles.primary} disabled={busy||!consent} onClick={onConfirm}>{busy?copy.working:'Continue to Stripe'}</button><button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Go back</button></div>
  </dialog>;
}
