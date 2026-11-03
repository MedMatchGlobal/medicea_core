'use client';
import {useEffect,useState} from 'react';
import {ACCESS_MODULES,type AccessModule,type ModulePermission} from '@/lib/membership/access-policy';
import styles from '../membership.module.css';
import local from './manager.module.css';
type Person={email:string;note:string;full_access:boolean;permissions:ModulePermission[]};
type Control={selected:boolean;limit:string;duration:string;date:string};
const modules=Object.keys(ACCESS_MODULES) as AccessModule[];
const initial=()=>Object.fromEntries(modules.map(m=>[m,{selected:false,limit:'unlimited',duration:'forever',date:''}])) as Record<AccessModule,Control>;
function expiry(c:Control){if(c.duration==='forever')return null;if(c.duration==='date')return new Date(c.date+'T23:59:59.999Z').toISOString();if(c.duration==='keep')return c.date;return new Date(Date.now()+Number(c.duration)*86400000).toISOString();}
export default function ComplimentaryManager(){
 const [people,setPeople]=useState<Person[]>([]),[email,setEmail]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 const [removing,setRemoving]=useState<string|null>(null),[editing,setEditing]=useState(false),[mode,setMode]=useState('full'),[controls,setControls]=useState(initial),[shared,setShared]=useState<Control>({selected:true,limit:'unlimited',duration:'forever',date:''});
 async function load(){const r=await fetch('/api/membership/complimentary',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setPeople(data.people);setLoaded(true);}
 useEffect(()=>{void load().catch(()=>setMessage('Could not load access. Refresh to try again.'));},[]);
 function reset(){setEmail('');setNote('');setEditing(false);setMode('full');setControls(initial());}
 function edit(person:Person){setEmail(person.email);setNote(person.note);setMode(person.full_access?'full':'custom');setEditing(true);const next=initial();for(const p of person.permissions)next[p.module]={selected:true,limit:p.monthlyLimit===null?'unlimited':String(p.monthlyLimit),duration:p.expiresAt?'keep':'forever',date:p.expiresAt||''};setControls(next);setMessage('');window.scrollTo({top:0,behavior:'smooth'});}
 async function save(action:'grant'|'revoke',person:{email:string;note:string}){
  setBusy(true);setMessage('');try{
   const permissions=action==='grant'&&mode==='custom'?modules.filter(m=>controls[m].selected).map(module=>({module,monthlyLimit:controls[module].limit==='unlimited'?null:Number(controls[module].limit),expiresAt:expiry(controls[module])})):[];
   if(action==='grant'&&mode==='custom'&&!permissions.length){setMessage('Select at least one module.');return;}
   const r=await fetch('/api/membership/complimentary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...person,action,policy:{mode,permissions}})});
   if(!r.ok){setMessage('Could not save. Check that allowances are whole numbers and expiry dates are in the future.');return;}await load();setRemoving(null);
   if(action==='grant')reset();
   setMessage(action==='grant'?'Access saved. They can sign in with that email.':'Complimentary access removed. Any paid access remains unchanged.');
  }catch{setMessage('Could not save. Check the dates and try again.');}finally{setBusy(false);}
 }
 function fields(value:Control,change:(v:Control)=>void){return <>
  <label>Monthly allowance<select value={value.limit==='unlimited'?'unlimited':['25','50'].includes(value.limit)?value.limit:'custom'} onChange={e=>change({...value,limit:e.target.value==='custom'?'100':e.target.value})}><option value="unlimited">Unlimited</option><option value="25">25 per month</option><option value="50">50 per month</option><option value="custom">Custom amount</option></select></label>
  {value.limit!=='unlimited'&&!['25','50'].includes(value.limit)&&<label>Uses per month<input type="number" min="1" max="100000" step="1" required value={value.limit} onChange={e=>change({...value,limit:e.target.value})}/></label>}
  <label>Duration<select value={value.duration} onChange={e=>change({...value,duration:e.target.value})}><option value="forever">No expiry</option><option value="7">7 days from saving</option><option value="30">30 days from saving</option><option value="90">90 days from saving</option><option value="date">Until a date</option>{value.duration==='keep'&&<option value="keep">Keep existing expiry</option>}</select></label>
  {value.duration==='date'&&<label>Last day of access (UTC)<input type="date" required value={value.date} onChange={e=>change({...value,date:e.target.value})}/></label>}
  {value.duration==='keep'&&<small>Expires {new Date(value.date).toLocaleString('en-GB')}</small>}
 </>;}
 return <main className={`${styles.page} ${local.page}`}>
  <header className={styles.header}><a href="/membership"><img src="/logo.png" alt="medicéa" width="180" height="60"/></a><a className={styles.back} href="/membership">← Your account</a></header>
  <p className={styles.previewNotice}>Private preview · Owner only</p>
  <h1>Complimentary access</h1><p className={local.intro}>Choose what someone can use, how much, and for how long.</p>
  <section className={local.card}><h2>{editing?'Edit access':'Add someone'}</h2><form onSubmit={e=>{e.preventDefault();void save('grant',{email,note});}}>
   <label>Email address<input required type="email" readOnly={editing} maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off"/></label>
   <label><span>Note <small>(optional, only you see this)</small></span><input maxLength={200} value={note} onChange={e=>setNote(e.target.value)} placeholder="Family, friend or tester"/></label>
   <fieldset className={local.wide}><legend>Access</legend><label className={local.choice}><input type="radio" name="access" checked={mode==='full'} onChange={()=>setMode('full')}/> Full access · all modules, unlimited, no expiry</label><label className={local.choice}><input type="radio" name="access" checked={mode==='custom'} onChange={()=>setMode('custom')}/> Choose modules, allowances and durations</label></fieldset>
   {mode==='custom'&&<div className={local.wide}>
    <details className={local.shared}><summary>Apply the same settings to selected modules</summary><div className={local.controls}>{fields(shared,setShared)}</div><button type="button" className={styles.secondary} onClick={()=>setControls(prev=>Object.fromEntries(modules.map(m=>[m,prev[m].selected?{...shared,selected:true}:prev[m]])) as Record<AccessModule,Control>)}>Apply to all selected</button></details>
    {modules.map(module=><fieldset key={module} className={local.module}><legend><label className={local.choice}><input type="checkbox" checked={controls[module].selected} onChange={e=>setControls({...controls,[module]:{...controls[module],selected:e.target.checked}})}/>{ACCESS_MODULES[module]}</label></legend>{controls[module].selected&&<div className={local.controls}>{fields(controls[module],c=>setControls({...controls,[module]:c}))}</div>}</fieldset>)}
    <p className={styles.small}>Allowances reset on the first of each month (UTC). Successful uses count; failed searches do not. Editing access does not reset usage. Unselected or expired modules follow normal free or paid access rules. Find care remains free.</p>
   </div>}
   <div className={local.wide}><button className={styles.primary} disabled={busy||!loaded}>{editing?'Save changes':mode==='full'?'Grant unlimited access':'Grant selected access'}</button>{editing&&<button type="button" className={styles.secondary} disabled={busy} onClick={reset}>Cancel edit</button>}</div>
  </form><p className={styles.small}>They must sign in using this exact email. Paid access takes priority. Existing subscriptions keep renewing until the person cancels them.</p></section>
  <p role="status" aria-live="polite">{busy?'Saving…':message}</p>
  <section className={local.card}><h2>People with access <span>({people.length})</span></h2>
   {!loaded?<p>Loading…</p>:people.length===0?<p>No one added yet.</p>:<ul className={local.list}>{people.map(person=><li key={person.email}><div><strong>{person.email}</strong>{person.note&&<p>{person.note}</p>}{person.full_access?<small>All modules · Unlimited · No expiry</small>:person.permissions.map(p=><p key={p.module}><small>{ACCESS_MODULES[p.module]} · {p.monthlyLimit===null?'Unlimited':`${p.monthlyLimit} per month`} · {p.expiresAt?`${Date.parse(p.expiresAt)<=Date.now()?'Expired':'Until'} ${new Date(p.expiresAt).toLocaleDateString('en-GB',{timeZone:'UTC'})}`:'No expiry'}</small></p>)}</div><div>{removing===person.email?<><p>Remove complimentary access?</p><button disabled={busy} className={styles.secondary} onClick={()=>void save('revoke',person)}>Yes, remove access</button> <button disabled={busy} className={styles.secondary} onClick={()=>setRemoving(null)}>Keep access</button></>:<><button disabled={busy} className={styles.secondary} onClick={()=>edit(person)}>Edit access</button> <button disabled={busy} className={styles.secondary} onClick={()=>setRemoving(person.email)}>Remove access</button></>}</div></li>)}</ul>}
  </section>
 </main>;
}
