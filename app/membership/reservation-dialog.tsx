'use client';
import {useEffect,useRef,useState} from 'react';
import type {BillingCurrency,PersonalPlan} from '@/lib/membership/config';
import {useMembershipCopy} from '../i18n/membership';
import styles from './membership.module.css';
export type ReservationQuote={plan:PersonalPlan;currency:BillingCurrency;amountMinor:number;startsAt:string};
export default function ReservationDialog({quote,busy,error,diagnostic,onConfirm,onClose}:{quote:ReservationQuote;busy:boolean;error?:string;diagnostic?:string;onConfirm:()=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),[consent,setConsent]=useState(false);
  const {copy,lang}=useMembershipCopy(),locale=lang==='en'?'en-GB':lang;
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  const amount=new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(quote.amountMinor/100);
  const date=new Date(quote.startsAt).toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'});
  return <dialog ref={dialog} className={styles.reservationDialog} aria-labelledby="reservation-heading" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <h2 id="reservation-heading">Upgrade to {copy[quote.plan]}</h2>
    <p>Starts {date}, after your current pass ends.</p>
    <dl className={styles.reservationAmounts}><dt>Charge now</dt><dd><strong><bdi>{new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(0)}</bdi></strong></dd><dt>Payment on start date</dt><dd><strong><bdi>{amount}</bdi></strong></dd></dl>
    <p id="reservation-terms">{quote.plan.startsWith('pass')?`${quote.plan==='pass7'?copy.ends7:quote.plan==='pass14'?copy.ends14:copy.ends30} No renewal or trial.`:quote.plan==='monthly'?copy.monthlyRenewal:copy.annualRenewal}</p>
    <label htmlFor="reservation-consent" className={styles.reservationConsent}><input id="reservation-consent" type="checkbox" checked={consent} disabled={busy} aria-describedby="reservation-terms" onChange={event=>setConsent(event.target.checked)}/><span>I authorise the {amount} charge on or after {date} using the card I select in Stripe.</span></label>
    <p className={styles.small}>You can cancel before it starts. Your saved searches stay in place.</p>
    {error&&<div role="alert" className={styles.authError}><p>{error}</p>{diagnostic&&<details><summary>Error details for support</summary><p>{diagnostic}</p></details>}</div>}
    <div className={styles.reservationActions}><button type="button" className={styles.primary} disabled={busy||!consent} onClick={onConfirm}>{busy?copy.working:'Continue to Stripe'}</button><button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Go back</button></div>
  </dialog>;
}
