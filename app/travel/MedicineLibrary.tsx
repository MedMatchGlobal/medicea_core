'use client';
import {useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {travelCopy} from '../i18n/travel-demo';
import {libraryCopy} from '../i18n/medicine-library';
import {countryName,DEMO_COUNTRIES,saveDemoComparisons,type DemoState,type DemoMedicine,type DemoCountry,type DemoComparison} from '../lib/travel-demo';
export default function MedicineLibrary({state,commit,lang,selected,setSelected,destination,setDestination,onPack}:{state:DemoState;commit:(state:DemoState)=>boolean;lang:string;selected:DemoMedicine[];setSelected:(ids:DemoMedicine[])=>void;destination:DemoCountry;setDestination:(code:DemoCountry)=>void;onPack:()=>void}){
 const c=travelCopy(lang),n=libraryCopy(lang),[candidate,setCandidate]=useState<DemoMedicine>('A'),[origin,setOrigin]=useState<DemoCountry>(state.home),[preview,setPreview]=useState<DemoComparison[]>([]);
 const available=(['A','B'] as const).filter(id=>!state.library.some(m=>m.id===id));
 const chosen=available.includes(candidate)?candidate:available[0];
 const options=DEMO_COUNTRIES.map(code=><option key={code} value={code}>{countryName(code,lang)}</option>);
 const results=[...preview.filter(r=>r.destination===destination),...state.comparisons.filter(r=>r.destination===destination&&!preview.some(p=>p.medicine===r.medicine&&p.destination===r.destination))].filter(r=>state.library.some(m=>m.id===r.medicine&&m.origin===r.origin));
 return <>
  <section className="travel-panel"><p>{n.libraryHelp}</p>{!state.library.length&&<p>{n.emptyMedicines}</p>}
   {available.length>0&&<form className="travel-library-add" onSubmit={event=>{event.preventDefault();if(!chosen)return;commit({...state,library:[...state.library,{id:chosen,origin}]});setSelected([...selected,chosen]);setPreview([]);}}><label>{c.medicine}<select aria-label={c.medicine} value={chosen} onChange={e=>setCandidate(e.target.value as DemoMedicine)}>{available.map(id=><option key={id} value={id}>{c.medicine} {id} · {id==='A'?10:50} mg</option>)}</select></label><label>{n.origin}<select aria-label={n.origin} value={origin} onChange={e=>setOrigin(e.target.value as DemoCountry)}>{options}</select></label><button className="travel-primary" type="submit"><Plus size={18} aria-hidden="true"/>{n.add}</button></form>}
  </section>
  {state.library.length>0&&<>
   <section className="travel-panel"><div className="travel-section-head"><h2>{n.mine}</h2><span className="travel-badge">{state.library.length}</span></div><p className="travel-caption">{n.selectSaved}</p><div className="travel-library-list">{state.library.map(m=><article key={m.id}>
    <label className="travel-check"><input type="checkbox" checked={selected.includes(m.id)} onChange={e=>setSelected(e.target.checked?[...selected,m.id]:selected.filter(id=>id!==m.id))}/><span><strong>{c.medicine} {m.id}</strong><small>{c.ingredient} {m.id} · {m.id==='A'?10:50} mg · {c.tablet}</small></span></label>
    <label>{n.origin}<select aria-label={`${n.origin}: ${c.medicine} ${m.id}`} value={m.origin} onChange={e=>{commit({...state,library:state.library.map(item=>item.id===m.id?{...item,origin:e.target.value as DemoCountry}:item),comparisons:state.comparisons.filter(item=>item.medicine!==m.id)});setPreview([]);}}>{options}</select></label>
    <button className="travel-text" aria-label={`${c.remove}: ${c.medicine} ${m.id}`} onClick={()=>{commit({...state,library:state.library.filter(item=>item.id!==m.id),comparisons:state.comparisons.filter(item=>item.medicine!==m.id)});setSelected(selected.filter(id=>id!==m.id));setPreview([]);}}><Trash2 size={16} aria-hidden="true"/>{c.remove}</button>
   </article>)}</div></section>
   <section className="travel-panel"><h2>{n.comparisons} · {countryName(destination,lang)}</h2><p className="travel-caption">{c.saved}: {state.comparisons.filter(r=>r.destination===destination).length}/{state.library.length}</p><div className="travel-section-head"><label>{c.destination}<select aria-label={`${n.comparisons}: ${c.destination}`} value={destination} onChange={e=>{setDestination(e.target.value as DemoCountry);setPreview([]);}}>{options}</select></label><button className="travel-primary" disabled={!selected.length} onClick={()=>setPreview(state.library.filter(m=>selected.includes(m.id)).map(m=>({medicine:m.id,origin:m.origin,destination,checkedAt:new Date().toISOString()})))}>{n.compare}</button></div>
    {state.library.filter(m=>!results.some(r=>r.medicine===m.id)).map(m=><article className="travel-comparison" key={m.id}><h3>{c.medicine} {m.id}</h3><p>{n.notCompared}</p></article>)}{results.map(result=><article key={result.medicine} className="travel-comparison"><h3>{c.medicine} {result.medicine} → {c.equivalent} {result.medicine}</h3><p>{countryName(result.origin,lang)} → {countryName(result.destination,lang)} · {c.ingredient} {result.medicine} · {result.medicine==='A'?10:50} mg · {c.tablet}</p><p className="travel-caption">{n.source}</p><p className="travel-caption">{n.checked}: <time dateTime={result.checkedAt}>{new Date(result.checkedAt).toLocaleString(lang)}</time></p>{preview.some(p=>p===result)?<button className="travel-secondary" onClick={()=>{commit(saveDemoComparisons(state,[result]));setPreview(preview.filter(p=>p!==result));}}>{n.saveComparison} · {c.medicine} {result.medicine}</button>:<span className="travel-badge">{c.saved}</span>}</article>)}
    <button className="travel-secondary" disabled={!selected.length} onClick={onPack}>{c.createTrip} → {n.packs}</button>
   </section>
  </>}
 </>;
}
