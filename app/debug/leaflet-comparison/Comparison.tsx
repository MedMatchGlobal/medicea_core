'use client';
import {useState} from 'react';
export default function Comparison(){
 const [busy,setBusy]=useState(false),[results,setResults]=useState<unknown[]>([]);
 async function run(arms:string[]){setBusy(true);try{for(let round=1;round<=2;round++){
  const pair=await Promise.all(arms.map(async arm=>{try{const r=await fetch('/api/model-test/leaflet-comparison',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({arm})});return {round,...await r.json()};}catch{return {round,arm,error:'Request failed'};}}));setResults(old=>[...old,...pair]);
 }}finally{setBusy(false);}}
 return <main style={{padding:24,maxWidth:1100,margin:'auto'}}><h1>Dev leaflet comparison</h1><p>Fixed public query: Co Codamol · United Kingdom · English · no strength. No prices or saved results. Each comparison runs two paired rounds: four provider requests.</p><p>09:40 request: ed508be. Current request: 645f4b3. Both use the same deployed API configuration. The second comparison changes only the web-action cap in each captured request.</p><button disabled={busy} onClick={()=>run(['0940','current'])}>Compare 09:40 and current</button>{' '}<button disabled={busy} onClick={()=>run(['0940-three-actions','current-one-action'])}>Isolate web-action cap</button><p role="status">{busy?'Comparison running…':results.length?`${results.length} results recorded`:'Ready'}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(results,null,2)}</pre></main>;
}
