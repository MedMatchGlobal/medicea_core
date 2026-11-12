'use client';
import {useState} from 'react';
export default function BareEquivalentTest({prompt}:{prompt:string}){
 const [busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),[error,setError]=useState('');
 async function run(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/preview/bare-equivalents',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const body=await response.json();
   if(!response.ok)throw Error('The request failed. No automatic retry was made.');
   setResult(body);
  }catch{setError('The request failed. No automatic retry was made.');}
  finally{setBusy(false);}
 }
 return <main style={{maxWidth:900,margin:'2rem auto',padding:24}}>
  <a href="/">Back to home</a>
  <h1>Bare Sonnet search comparison</h1>
  <p>Exact prompt sent:</p>
  <blockquote style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{prompt}</blockquote>
  <p>Sonnet medium with web search enabled. No added system prompt, second lookup or medicine-result filtering.</p>
  <button className="pill pill--blue" disabled={busy||!!result} onClick={run}>{busy?'Waiting for Sonnet…':result?'Test completed':'Run one bare search'}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<section aria-label="Unfiltered Sonnet answer" aria-live="polite">
   <p>Raw research answer · {Math.round(result.elapsedMs/1000)} seconds. This output has not passed medicéa’s equivalence checks.</p>
   <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit',lineHeight:1.65}}>{result.response||'Sonnet returned no text.'}</pre>
   <details><summary>Original text blocks and usage</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({model:result.model,textBlocks:result.textBlocks,usage:result.usage},null,2)}</pre></details>
  </section>}
 </main>;
}
