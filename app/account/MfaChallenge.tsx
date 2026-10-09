'use client';
import {useState} from 'react';
import {MfaForm} from './AccountForms';
import styles from './account.module.css';

export default function MfaChallenge({factors}:{factors:{id:string;name:string}[]}){
  const [selected,setSelected]=useState(factors[0]?.id||'');
  if(!factors.length)return <p className={styles.error}>No verified authenticator was found. Reload your account page.</p>;
  return <>
    {factors.length>1&&<div className={styles.form}><label>Choose your authenticator<select value={selected} onChange={e=>setSelected(e.target.value)}>{factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><small>Use the code from the authenticator selected above. Your backup can verify this sign-in if your primary device is unavailable.</small></div>}
    <MfaForm key={selected} factorId={selected}/>
  </>;
}
