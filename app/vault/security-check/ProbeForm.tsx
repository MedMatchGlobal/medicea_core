'use client';
import {useState,useTransition} from 'react';
import {prepareStorageProbe,runStorageProbe,cleanupStorageProbe} from './actions';
import styles from '../../account/account.module.css';
export default function ProbeForm(){
  const [path,setPath]=useState('');
  const [message,setMessage]=useState('');
  const [rows,setRows]=useState<{check:string;result:string}[]>([]);
  const [pending,start]=useTransition();
  function run(anonymous:boolean){start(async()=>{setMessage('');setRows([]);try{const result=await runStorageProbe(path.trim(),anonymous);setMessage(result.error||result.session||'');setRows(result.rows||[]);}catch{setMessage('Test unavailable. Retry or report this error.');}});}
  return <div className={styles.form}>
    <button disabled={pending} onClick={()=>start(async()=>{try{const result=await prepareStorageProbe();setMessage(result.error||'Disposable probe created. Copy the path below for the other sessions.');if(result.path)setPath(result.path);setRows([]);}catch{setMessage('Could not prepare the probe.');}})}>1. Create disposable probe (owner account)</button>
    <label>Disposable test path<input value={path} disabled={pending} onChange={e=>setPath(e.target.value)} spellCheck={false}/></label>
    <button disabled={pending||!path} onClick={()=>run(false)}>Run tests using this signed-in session</button>
    <button disabled={pending||!path} onClick={()=>run(true)}>Run tests anonymously</button>
    {pending&&<p role="status">Running storage checks…</p>}
    {message&&<p role="status">{message}</p>}
    {!!rows.length&&<table><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>{rows.map((row,i)=><tr key={i}><td>{row.check}</td><td style={{color:row.result==='PASS'?'#17633c':'#b42318',fontWeight:700}}>{row.result}</td></tr>)}</tbody></table>}
    <button className={styles.secondary} disabled={pending||!path} onClick={()=>start(async()=>{try{const result=await cleanupStorageProbe(path.trim());setMessage(result.error||result.success||'');}catch{setMessage('Cleanup failed.');}})}>Remove disposable probe (after all tests)</button>
  </div>;
}
