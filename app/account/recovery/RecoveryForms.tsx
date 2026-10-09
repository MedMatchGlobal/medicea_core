'use client';
import {useState,useTransition} from 'react';
import {generateRecoveryCodes,verifyRecoveryCode} from './actions';
import styles from '../account.module.css';

export function RecoveryForms({verified,exists,remaining,statusError}:{verified:boolean;exists:boolean;remaining:number|null;statusError?:string}){
  const [codes,setCodes]=useState<string[]>([]);
  const [code,setCode]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  const [pending,start]=useTransition();
  if(statusError)return <p className={styles.error} role="alert">{statusError}</p>;
  return <>
    <h2>{verified?'Save recovery codes':'Use a saved recovery code'}</h2>
    {verified?<div className={styles.form}>
      <p>{remaining===null?'No recovery codes are saved for this account.':`${remaining} unused recovery codes remain.`} Each code can be used once after email sign-in.</p>
      {!codes.length&&!saved&&<>
        <p>{exists?'Replacing the set immediately invalidates every previous recovery code.':'Generate codes while your authenticator is working.'} Keep them somewhere safe that you can access if you lose your phone. Do not email them or share them with support.</p>
        <label className={styles.checkLabel}><input type="checkbox" checked={confirmed} disabled={pending} onChange={e=>setConfirmed(e.target.checked)}/> I will save the new codes. I understand that replacing a set invalidates its old codes.</label>
        <button disabled={pending||!confirmed} onClick={()=>start(async()=>{setError('');try{const result=await generateRecoveryCodes(exists,confirmed);if(result.error)setError(result.error);if(result.codes)setCodes(result.codes);}catch{setError('Could not generate codes. Reload and check their status before retrying.');}})}>{pending?'Preparing…':exists?'Replace recovery codes':'Generate recovery codes'}</button>
      </>}
      {!!codes.length&&<>
        <p className={styles.notice}>These codes are shown once. Save them privately before leaving or refreshing this page.</p>
        <ul className={styles.recoveryCodes}>{codes.map(value=><li key={value}><code>{value.match(/.{1,4}/g)?.join('-')||value}</code></li>)}</ul>
        <button className={styles.secondary} onClick={()=>{setCodes([]);setSaved(true);}}>I saved my codes — hide them</button>
      </>}
      {saved&&<p role="status">Codes hidden. You can return to your account; the saved set remains valid.</p>}
    </div>:<form className={styles.form} onSubmit={e=>{e.preventDefault();start(async()=>{setError('');try{const result=await verifyRecoveryCode(code);if(result.error)setError(result.error);}catch{setError('Could not verify. Return to your account page to check your session before retrying.');}finally{setCode('');}});}}>
      <p>Enter one unused code saved for this account. Successful verification restores access for this session. Your existing authenticator remains enrolled.</p>
      <label>Recovery code<input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={128} required value={code} disabled={pending} onChange={e=>setCode(e.target.value)}/></label>
      <button disabled={pending||!code.trim()}>{pending?'Checking…':'Verify recovery code'}</button>
    </form>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </>;
}
