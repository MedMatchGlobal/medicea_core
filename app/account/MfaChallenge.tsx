'use client';
import { HealthText } from '@/app/health-i18n/HealthLanguage';

import {useState} from 'react';
import {MfaForm} from './AccountForms';
import styles from './account.module.css';

export default function MfaChallenge({factors}:{factors:{id:string;name:string}[]}){
  const [selected,setSelected]=useState(factors[0]?.id||'');
  if(!factors.length)return <p className={styles.error}><HealthText text={"No verified authenticator was found. Reload your account page."} /></p>;
  return <>
    {factors.length>1&&<div className={styles.form}><label><HealthText text={"Choose your authenticator"} /><select value={selected} onChange={e=>setSelected(e.target.value)}>{factors.map((f,i)=><option key={f.id} value={f.id}><HealthText text={f.name} /> ({i+1})</option>)}</select></label><small><HealthText text={"Use the code from the authenticator selected above. Your backup can verify this sign-in if your primary device is unavailable."} /></small></div>}
    <MfaForm key={selected} factorId={selected}/>
  </>;
}
