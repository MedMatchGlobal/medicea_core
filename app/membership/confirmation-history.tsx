'use client';
import {useEffect,useRef,useState} from 'react';
import {useMembershipCopy} from '../i18n/membership';
export default function ConfirmationHistory(){
 const {copy}=useMembershipCopy(),[rows,setRows]=useState<Array<{id:string;created_at:string;kind:string;plan:string}>>([]),[next,setNext]=useState<string|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),pending=useRef(false);
 async function load(after?:string){if(pending.current)return;pending.current=true;setBusy(true);setError(false);try{const response=await fetch('/api/membership/confirmations'+(after?'?after='+encodeURIComponent(after):''),{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();setRows(old=>after?[...old,...data.confirmations.filter((r:{id:string})=>!old.some(p=>p.id===r.id))]:data.confirmations);setNext(data.next);}catch{setError(true);}finally{pending.current=false;setBusy(false);}}
 useEffect(()=>{void load();},[]);
 if(!rows.length&&!error)return null;
 return <div><h3>Purchase confirmations (English)</h3>{rows.map(row=><p key={row.id}><a href={'/api/membership/confirmations?id='+row.id}>Download {row.kind==='scheduled_upgrade'?'scheduled upgrade':row.kind==='renewal'?'renewal':'purchase'} confirmation · {new Date(row.created_at).toLocaleDateString()}</a></p>)}{error&&<p role="alert">Confirmation downloads are unavailable. <button disabled={busy} onClick={()=>void load()}>{copy.tryAgain}</button></p>}{next&&<button disabled={busy} onClick={()=>void load(next)}>Older confirmations</button>}</div>;
}
