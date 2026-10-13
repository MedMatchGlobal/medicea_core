"use client";
import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {PERSONAL_PLANS,type PersonalPlan} from '@/lib/membership/config';
export default function MembershipPreview(){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[status,setStatus]=useState<any>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[native,setNative]=useState(true);
 const [drug,setDrug]=useState(''),[origin,setOrigin]=useState(''),[target,setTarget]=useState(''),[result,setResult]=useState(''),[more,setMore]=useState(false);
 const accessOptions=useRef<HTMLHeadingElement>(null);
 async function refresh(){const response=await fetch('/api/membership/status',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error('Membership is not configured yet.');setStatus(data);}
 useEffect(()=>{setNative(Capacitor.isNativePlatform());refresh().catch(e=>setMessage(e.message));},[]);
 async function run(path:string,body:any){setBusy(true);setMessage('');try{const response=await fetch('/api/membership/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');if(data.url){window.location.assign(data.url);return;}if(path==='search')setResult(data.equivalentResults?.raw_text||'No matches.');else setMessage(body.action==='send'?'Check your email for a sign-in code.':'Done.');await refresh();}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
 const checkout=(plan:PersonalPlan)=>run('checkout',{plan});
 const price=(plan:PersonalPlan)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(PERSONAL_PLANS[plan].amountMinor/100);
 return <main style={{maxWidth:700,margin:'40px auto',padding:24}}>
 <a href="/">Back to medicine search</a><h1>mediceaGO Personal</h1>
 <p>Private launch-pricing preview. Stripe payments are in test mode.</p>
 <p>Welcome trial: five successful premium searches across seven days, starting with your first successful premium search. No card, no automatic payment. Available once per account. Failed requests and reopening saved results do not use trial searches.</p>
 <p>After the trial, the free tier remains available with two successful new searches per UTC calendar month. Your saved results stay available.</p>
 {!status?.signedIn?<section><h2>Sign in to try it</h2><label>Email <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><button disabled={busy||!email} onClick={()=>run('auth',{action:'send',email})}>Email a code</button><label>Code <input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code"/></label><button disabled={busy||!code} onClick={()=>run('auth',{action:'verify',email,code})}>Verify</button></section>:<section>
 <p>Signed in as {status.email}</p>
 <p>{status.premium?'Personal paid access active':`${status.used} of ${status.limit} free searches used this month.`}</p>
 {!status.premium&&status.trialAvailable&&status.trialUsed<status.trialLimit&&<p>Welcome trial: {status.trialLimit-status.trialUsed} successful searches left.{status.trialEndsAt?` Ends ${new Date(status.trialEndsAt).toLocaleString()}.`:' Its seven-day clock has not started yet.'}</p>}
 <p>{!status.premium&&<>Free allowance resets {new Date(status.resetsAt).toLocaleDateString()}. </>}{status.reserved} searches in progress.</p>
 {!native&&!status.premium&&<p><button disabled={busy} onClick={()=>{accessOptions.current?.scrollIntoView({block:'center'});accessOptions.current?.focus({preventScroll:true});}} style={{background:'#2563eb',color:'#fff',border:0,borderRadius:8,padding:'10px 18px',fontWeight:600,cursor:'pointer'}}>Upgrade</button></p>}
 <button disabled={busy} onClick={()=>run('auth',{action:'signout'})}>Sign out</button>
 <h2>Test a medicine search</h2><p>This isolated search tests the account quota. The public discovery interface is unchanged.</p>
 <label>Medicine <input value={drug} onChange={e=>setDrug(e.target.value)}/></label><label>Origin country <input value={origin} onChange={e=>setOrigin(e.target.value)}/></label><label>Target country <input value={target} onChange={e=>setTarget(e.target.value)}/></label><button disabled={busy||!drug||!origin||!target} onClick={()=>run('search',{drugName:drug,originCountry:origin,targetCountry:target,lang:'en'})}>Run test search</button><pre style={{whiteSpace:'pre-wrap'}}>{result}</pre>
 {!native&&<section><h2 ref={accessOptions} tabIndex={-1}>Choose personal access</h2><p>Launch prices. Personal manual use only; fair-use terms still need approval. No professional or shared-team use.</p>
 <button disabled={busy||status.premium} onClick={()=>checkout('pass30')}>For this trip · {price('pass30')} for 30 days</button><p>One payment. Ends automatically. No renewal.</p>
 <button disabled={busy||status.premium} onClick={()=>checkout('annual')}>For regular use · {price('annual')}/year</button><p>Annual subscription. Automatically renews at {price('annual')} each year unless canceled; cancellation stops future renewals.</p>
 <button onClick={()=>setMore(!more)} aria-expanded={more}>{more?'Fewer options':'More options'}</button>
 {more&&<><button disabled={busy||status.premium} onClick={()=>checkout('pass7')}>7-day pass · {price('pass7')}</button><button disabled={busy||status.premium} onClick={()=>checkout('pass14')}>14-day pass · {price('pass14')}</button><p>Both passes end automatically without another charge.</p><button disabled={busy||status.premium} onClick={()=>checkout('monthly')}>Monthly subscription · {price('monthly')}/month</button><p>Automatically renews at {price('monthly')} monthly unless canceled. Cancel anytime to stop future renewals.</p></>}
 <button disabled={busy} onClick={()=>run('portal',{})}>Manage test subscription</button></section>}
 {native&&<p>Android purchases are not enabled in this preview.</p>}
 </section>}
 <p role="status">{busy?'Working…':message}</p><button disabled={busy} onClick={()=>refresh().catch(e=>setMessage(e.message))}>Refresh account status</button>
 </main>;
}
