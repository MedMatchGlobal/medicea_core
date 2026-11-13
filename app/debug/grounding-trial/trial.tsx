'use client';
import {useRef,useState} from 'react';
export default function Trial({prompt}:{prompt:string}){
 const [busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),once=useRef(false);
 async function run(){if(once.current)return;once.current=true;setBusy(true);try{
  const response=await fetch('/api/preview/grounding-trial',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});setResult(await response.json());
 }catch{setResult({error:'Connection interrupted. No automatic retry was made.'});}finally{setBusy(false);}}
 return <main style={{maxWidth:960,margin:'2rem auto',padding:24,lineHeight:1.6,overflowWrap:'anywhere'}}>
  <a href="/">Back to medicea</a><h1>Grounded equivalence trial</h1>
  <p>Co-Efferalgan 500 mg + 30 mg film-coated tablets · Italy → United Kingdom</p>
  <p>One research request, at most four searches, then one extraction request. Total server time capped at 65 seconds. No retries or leaflet requests.</p>
  <p>This tests discovery and comparison alongside the current search. Independent registry and terminology adapters are still pending. Candidates remain possible matches until their facts are independently supported.</p>
  <details><summary>Exact research prompt</summary><pre style={{whiteSpace:'pre-wrap'}}>{prompt}</pre></details>
  <button className="pill pill--blue" disabled={busy||once.current} onClick={run}>{busy?'Researching and checking…':once.current?'Trial completed':'Run one grounded trial'}</button>
  {result&&<section aria-live="polite"><h2>Trial result</h2><p>{result.notice||result.error}</p>{result.error&&<p role="alert">{result.error}</p>}
   <p>{Math.round((result.elapsedMs||0)/1000)} seconds · {result.audit?.searches??0} searches · {result.rows?.length??0} candidates</p>
   {(result.rows||[]).map((row:any,i:number)=><article key={i} style={{border:'1px solid #d9d2c6',borderRadius:16,padding:20,margin:'1rem 0'}}>
    <h3>{row.product?.name_as_written||'Unidentified candidate'}</h3><p><strong>{row.result.label}</strong></p>
    <ul>{(row.product?.ingredients||[]).map((ing:any,n:number)=><li key={n}>{ing.name_as_written}: {ing.strength?.raw||'Strength unverified'}</li>)}</ul>
    <details><summary>Comparison and missing evidence</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify({fields:row.result.fields,issues:row.result.issues,excipients:row.result.excipients},null,2)}</pre></details>
   </article>)}
   <details><summary>Research notes, audit and usage</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result,null,2)}</pre></details>
  </section>}
 </main>;
}
