'use client';
import {useState} from 'react';
const names=['origin','leaflet','translatedLeaflet','information','generics','pets','petGenerics','veterinary','condition','triage','translation','jsonTranslation'];
export default function ClaudeEvaluation(){
 const [busy,setBusy]=useState(''),[results,setResults]=useState<Record<string,unknown>>({});
 async function run(fixture:string){setBusy(fixture);try{const r=await fetch('/api/claude-evaluation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixture})});const data=await r.json();setResults(previous=>({...previous,[fixture]:data}));}catch{setResults(previous=>({...previous,[fixture]:{error:'Request failed'}}));}finally{setBusy('');}}
 return <main style={{padding:24,maxWidth:1100,margin:'auto'}}><h1>Claude Preview · public fixture checks</h1><p>These buttons run fixed public medicine examples or fictional health examples. They do not accept personal records. Each result shows the actual provider model, timings and output. This diagnostic page is separate from the product interface.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{names.map(name=><button key={name} disabled={!!busy} onClick={()=>run(name)}>{name}</button>)}</div>{busy&&<p role="status">Running {busy}…</p>}{Object.entries(results).map(([name,result])=><section key={name}><h2>{name}</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(result,null,2)}</pre></section>)}</main>;
}
