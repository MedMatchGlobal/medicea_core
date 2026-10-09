'use client';
import { HealthText, useHealthText } from '@/app/health-i18n/HealthLanguage';

import {useId,useState,useTransition} from 'react';
import {sendCode,verifyCode,beginMfa,verifyMfa} from './actions';
import styles from './account.module.css';

export function SignInForm({enabled}:{enabled:boolean}) {
  const [email,setEmail]=useState(''); const [code,setCode]=useState('');
  const [sent,setSent]=useState(false); const [error,setError]=useState('');
  const [pending,start]=useTransition();
  return <form className={styles.form} onSubmit={e=>{e.preventDefault();start(async()=>{setError('');const result=sent?await verifyCode(email.trim(),code.trim()):await sendCode(email.trim());if(result.error)setError(result.error);if(result.sent)setSent(true);});}}>
    <label><HealthText text={"Email address"} /><input dir="ltr" type="email" autoComplete="email" required maxLength={254} value={email} disabled={!enabled||pending||sent} onChange={e=>setEmail(e.target.value)}/></label>
    {sent&&<><p role="status"><HealthText text={"If delivery succeeds, your email will contain a sign-in code. This works for new and existing accounts."} /></p><label><HealthText text={"Verification code"} /><input dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code} onChange={e=>setCode(e.target.value)}/></label></>}
    {error&&<p role="alert">{<HealthText text={error} />}</p>}
    <button disabled={!enabled||pending}>{pending?<HealthText text={"Please wait…"} />:sent?<HealthText text={"Verify and sign in"} />:<HealthText text={"Email me a sign-in code"} />}</button>
    {sent&&<button type="button" className={styles.secondary} disabled={pending} onClick={()=>{setSent(false);setCode('');setError('');}}><HealthText text={"Change email or request a new code"} /></button>}
    <small><HealthText text={"No password to remember. Access to your email is required to sign in. An enrolled authenticator is also required when two-factor authentication is enabled."} /></small>
  </form>;
}

export function MfaForm({factorId,backup=false}:{factorId?:string;backup?:boolean}) {
  const tr = useHealthText();
  const hintId=useId();
  const [setup,setSetup]=useState<{id:string;qr:string}|null>(null);
  const [code,setCode]=useState('');const [error,setError]=useState('');const [pending,start]=useTransition();
  const id=factorId||setup?.id;
  return <div className={styles.form}>
    {!id&&<button disabled={pending} onClick={()=>start(async()=>{setError('');try{const result=await beginMfa(backup);if(result.error)setError(result.error);else if(result.id&&result.qr)setSetup({id:result.id,qr:result.qr});}catch{setError('Unable to start authenticator setup. Try again later.');}})}>{backup?<HealthText text={"Set up a backup authenticator"} />:<HealthText text={"Set up an authenticator"} />}</button>}
    {setup&&<><p><HealthText text={"Scan this code using your authenticator app, then enter its six-digit code. Keep the QR code private."} /></p><img width={200} height={200} src={setup.qr.startsWith('data:')?setup.qr:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qr)}`} alt={tr("Private authenticator setup QR code")}/></>}
    {id&&<form noValidate className={styles.form} onSubmit={e=>{
      e.preventDefault();
      const enteredCode=code.trim();
      if(!/^[0-9]{6}$/.test(enteredCode)){
        setError('Enter exactly six digits from your authenticator app. Letters and shorter codes are not accepted.');
        return;
      }
      setError('');
      start(async()=>{const result=await verifyMfa(id,enteredCode);if(result.error)setError(result.error);});
    }}><label><HealthText text={"Authenticator code"} /><input dir="ltr" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required aria-invalid={Boolean(error)} aria-describedby={error?`${hintId} ${hintId}-error`:hintId} disabled={pending} value={code} onChange={e=>{setCode(e.target.value);setError('');}}/></label><small id={hintId}><HealthText text={"Enter the six digits shown in your authenticator app, including any leading zero. Use the authenticator code here, rather than your email sign-in code."} /></small>{error&&<p id={`${hintId}-error`} className={styles.error} role="alert"><strong><HealthText text={"Unable to verify."} /></strong> {<HealthText text={error} />}</p>}<button disabled={pending}>{pending?<HealthText text={"Checking…"} />:<HealthText text={"Verify authenticator"} />}</button></form>}
    {!id&&error&&<p className={styles.error} role="alert">{<HealthText text={error} />}</p>}
  </div>;
}
