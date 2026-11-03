'use client';
import {useEffect,useState} from 'react';
import styles from '../membership.module.css';
import local from './manager.module.css';
type Person={email:string;note:string};
export default function ComplimentaryManager(){
 const [people,setPeople]=useState<Person[]>([]),[email,setEmail]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 const [removing,setRemoving]=useState<string|null>(null);
 async function load(){const r=await fetch('/api/membership/complimentary',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setPeople(data.people);setLoaded(true);}
 useEffect(()=>{void load().catch(()=>setMessage('Could not load access. Refresh to try again.'));},[]);
 async function save(action:'grant'|'revoke',person:Person){
  setBusy(true);setMessage('');try{
   const r=await fetch('/api/membership/complimentary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...person,action})});
   if(!r.ok)throw Error();await load();setRemoving(null);
   if(action==='grant'){setEmail('');setNote('');}
   setMessage(action==='grant'?'Unlimited access granted. They can sign in with that email.':'Complimentary access removed. Any paid access remains unchanged.');
  }catch{setMessage('Could not save. Please try again.');}finally{setBusy(false);}
 }
 return <main className={`${styles.page} ${local.page}`}>
  <header className={styles.header}><a href="/membership"><img src="/logo.png" alt="medicéa" width="180" height="60"/></a><a className={styles.back} href="/membership">← Your account</a></header>
  <p className={styles.previewNotice}>Private preview · Owner only</p>
  <h1>Complimentary access</h1><p className={local.intro}>Give family, friends and testers unlimited personal access, for as long as you choose.</p>
  <section className={local.card}><h2>Add someone</h2><form onSubmit={e=>{e.preventDefault();void save('grant',{email,note});}}>
   <label>Email address<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off"/></label>
   <label><span>Note <small>(optional, only you see this)</small></span><input maxLength={200} value={note} onChange={e=>setNote(e.target.value)} placeholder="Family, friend or tester"/></label>
   <button className={styles.primary} disabled={busy||!loaded}>Grant unlimited access</button>
  </form><p className={styles.small}>They must sign in using this exact email. No expiry and no purchase prompts. Existing subscriptions keep renewing until the person cancels them.</p></section>
  <p role="status" aria-live="polite">{busy?'Saving…':message}</p>
  <section className={local.card}><h2>People with access <span>({people.length})</span></h2>
   {!loaded?<p>Loading…</p>:people.length===0?<p>No one added yet.</p>:<ul className={local.list}>{people.map(person=><li key={person.email}><div><strong>{person.email}</strong>{person.note&&<p>{person.note}</p>}<small>Unlimited · No expiry</small></div><div>{removing===person.email?<><p>Remove complimentary access?</p><button disabled={busy} className={styles.secondary} onClick={()=>void save('revoke',person)}>Yes, remove access</button> <button disabled={busy} className={styles.secondary} onClick={()=>setRemoving(null)}>Keep access</button></>:<button disabled={busy} className={styles.secondary} onClick={()=>setRemoving(person.email)}>Remove access</button>}</div></li>)}</ul>}
  </section>
 </main>;
}
