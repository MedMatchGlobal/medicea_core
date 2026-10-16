'use client';
import {useEffect,useState} from 'react';
import {Plus,Trash2,X} from 'lucide-react';
import {travelCopy} from '../i18n/travel-demo';
import {libraryCopy} from '../i18n/medicine-library';
import {reviewCopy} from '../i18n/comparison-review';
import {destinationCopy} from '../i18n/destination-packs';
import {countryName,DEMO_COUNTRIES,comparisonReviewDate,comparisonReviewDue,saveDemoComparisons,type DemoState,type DemoMedicine,type DemoCountry,type DemoComparison} from '../lib/travel-demo';
export default function MedicineLibrary({state,commit,lang,selected,setSelected,destination,setDestination,onPack,openMedicine,backToPack}:{state:DemoState;commit:(state:DemoState)=>boolean;lang:string;selected:DemoMedicine[];setSelected:(ids:DemoMedicine[])=>void;destination:DemoCountry;setDestination:(code:DemoCountry)=>void;onPack:()=>void;openMedicine?:DemoMedicine;backToPack?:()=>void}){
 const c=travelCopy(lang),n=libraryCopy(lang),r=reviewCopy(lang),d=destinationCopy(lang),[candidate,setCandidate]=useState<DemoMedicine>('A'),[origin,setOrigin]=useState<DemoCountry>(state.home),[preview,setPreview]=useState<DemoComparison[]>([]);
 useEffect(()=>{if(openMedicine)document.getElementById('medicine-'+openMedicine)?.scrollIntoView({block:'start'});},[openMedicine]);
 const available=(['A','B'] as const).filter(id=>!state.library.some(m=>m.id===id));
 const chosen=available.includes(candidate)?candidate:available[0];
 const options=DEMO_COUNTRIES.map(code=><option key={code} value={code}>{countryName(code,lang)}</option>);
 const date=(value:string)=>new Date(value).toLocaleDateString(lang,{timeZone:'UTC'});
 const due=state.comparisons.filter(item=>comparisonReviewDue(item.checkedAt));
 function compare(id:DemoMedicine){const m=state.library.find(item=>item.id===id);if(m)setPreview(current=>[...current.filter(item=>item.medicine!==id||item.destination!==destination),{medicine:id,origin:m.origin,destination,checkedAt:new Date().toISOString()}]);}
 return <>
  <section className="travel-panel"><p>{n.libraryHelp}</p>{!state.library.length&&<p>{n.emptyMedicines}</p>}
   {available.length>0&&<form className="travel-library-add" onSubmit={event=>{event.preventDefault();if(!chosen)return;commit({...state,library:[...state.library,{id:chosen,origin}]});setSelected([...selected,chosen]);}}><label>{c.medicine}<select aria-label={c.medicine} value={chosen} onChange={e=>setCandidate(e.target.value as DemoMedicine)}>{available.map(id=><option key={id} value={id}>{c.medicine} {id} · {id==='A'?10:50} mg</option>)}</select></label><label>{n.origin}<select aria-label={n.origin} value={origin} onChange={e=>setOrigin(e.target.value as DemoCountry)}>{options}</select></label><button className="travel-primary" type="submit"><Plus size={18} aria-hidden="true"/>{n.add}</button></form>}
  </section>
  {state.library.length>0&&<>
   <section className="travel-panel"><div className="travel-section-head"><h2>{n.mine}</h2><span className="travel-badge">{state.library.length}</span></div><p className="travel-caption">{n.selectSaved} · {d.packs}</p><p className="travel-caption">{r.annualHelp}</p>
   {due.length>0&&<p className="travel-review-due" role="status">{r.reviewDue}: {due.map(item=>`${c.medicine} ${item.medicine} · ${countryName(item.destination,lang)}`).join('; ')}</p>}
   <div className="travel-library-list">{state.library.map(m=>{
    const saved=state.comparisons.filter(item=>item.medicine===m.id&&item.origin===m.origin).sort((a,b)=>a.destination.localeCompare(b.destination));
    const pending=preview.filter(item=>item.medicine===m.id&&item.origin===m.origin);
    return <article key={m.id} className="travel-library-entry">
     <label className="travel-pack-select"><input type="checkbox" aria-label={`${n.selectSaved}: ${c.medicine} ${m.id}`} checked={selected.includes(m.id)} onChange={e=>setSelected(e.target.checked?[...selected,m.id]:selected.filter(id=>id!==m.id))}/></label>
     <details className="travel-medicine-details" id={'medicine-'+m.id} open={openMedicine===m.id?true:undefined}><summary><strong>{c.medicine} {m.id}</strong><small>{c.ingredient} {m.id} · {m.id==='A'?10:50} mg · {c.tablet} · {countryName(m.origin,lang)}</small><span className="travel-caption">{n.comparisons}: {saved.length? saved.map(item=>countryName(item.destination,lang)).join(', '):'—'}</span>{saved.some(item=>comparisonReviewDue(item.checkedAt))&&<span className="travel-review-due">{r.reviewDue}</span>}</summary>
      {openMedicine===m.id&&backToPack&&<button className="travel-secondary" onClick={backToPack}>{c.back} · {d.packs}</button>}
      <label>{n.origin}<select aria-label={`${n.origin}: ${c.medicine} ${m.id}`} value={m.origin} onChange={e=>{commit({...state,library:state.library.map(item=>item.id===m.id?{...item,origin:e.target.value as DemoCountry}:item),comparisons:state.comparisons.filter(item=>item.medicine!==m.id)});setPreview(preview.filter(item=>item.medicine!==m.id));}}>{options}</select></label>
      <h3>{n.comparisons}</h3>
      {!saved.length&&<p>{n.notCompared}</p>}
      {saved.map(result=><section key={result.destination} className="travel-comparison travel-saved-comparison"><h4>{countryName(result.destination,lang)}</h4><span className="travel-badge">{c.saved}</span><p className="travel-caption">{r.demoChecked}: <time dateTime={result.checkedAt}>{date(result.checkedAt)}</time></p><p className={comparisonReviewDue(result.checkedAt)?'travel-review-due':'travel-caption'}>{comparisonReviewDue(result.checkedAt)?r.reviewDue:r.reviewOn}: <time dateTime={comparisonReviewDate(result.checkedAt)}>{date(comparisonReviewDate(result.checkedAt))}</time></p>
       <details className="travel-saved-equivalents"><summary><span className="travel-show-equivalents">{r.showEquivalents}</span><span className="travel-hide-equivalents">{r.hideEquivalents}</span></summary><div className="travel-equivalent-content"><h4>{c.equivalent} {result.medicine}</h4><p className="travel-caption">{n.source}</p>
       {!!result.previousChecks?.length&&<><p role="status">{r.unchanged}</p><details className="travel-comparison-history"><summary>{r.previous} · {result.previousChecks.length}</summary><ul>{result.previousChecks.map(value=><li key={value}><time dateTime={value}>{new Date(value).toLocaleString(lang)}</time> · {c.equivalent} {result.medicine}</li>)}</ul></details></>}
       <button className="travel-secondary" aria-label={`${r.refresh}: ${c.medicine} ${m.id} · ${countryName(result.destination,lang)}`} onClick={()=>{commit(saveDemoComparisons(state,[{medicine:m.id,origin:m.origin,destination:result.destination,checkedAt:new Date().toISOString()}]));setPreview(preview.filter(item=>item.medicine!==m.id||item.destination!==result.destination));}}>{r.refresh}</button></div></details>
       <button type="button" className="travel-text travel-delete-comparison" aria-label={`${r.deleteComparison}: ${c.medicine} ${m.id} · ${countryName(result.destination,lang)}`} onClick={()=>commit({...state,comparisons:state.comparisons.filter(item=>!(item.medicine===result.medicine&&item.origin===result.origin&&item.destination===result.destination))})}><Trash2 size={16} aria-hidden="true"/>{r.deleteComparison}</button>
      </section>)}
      <div className="travel-medicine-compare"><h3>{r.compareAnother}</h3><label>{c.destination}<select aria-label={`${c.destination}: ${c.medicine} ${m.id}`} value={destination} onChange={e=>{setDestination(e.target.value as DemoCountry);}}>{options}</select></label><button className="travel-primary" onClick={()=>compare(m.id)}>{r.compareAnother}</button></div>
      {pending.map(pending=><section key={pending.destination} className="travel-comparison travel-pending-comparison" aria-live="polite"><button type="button" className="travel-dismiss-comparison" aria-label={`${r.dismiss}: ${c.medicine} ${m.id} · ${countryName(pending.destination,lang)}`} title={r.dismiss} onClick={()=>setPreview(current=>current.filter(item=>item!==pending))}><X size={18} aria-hidden="true"/></button><h4>{countryName(pending.destination,lang)} → {c.equivalent} {m.id}</h4><p className="travel-caption">{n.source}</p><p>{r.demoChecked}: {date(pending.checkedAt)}</p><button className="travel-secondary" onClick={()=>{commit(saveDemoComparisons(state,[pending]));setPreview(preview.filter(item=>item!==pending));}}>{n.saveComparison} · {c.medicine} {m.id} · {countryName(pending.destination,lang)}</button></section>)}
      <button className="travel-text" aria-label={`${c.remove}: ${c.medicine} ${m.id}`} onClick={()=>{commit({...state,library:state.library.filter(item=>item.id!==m.id),comparisons:state.comparisons.filter(item=>item.medicine!==m.id)});setSelected(selected.filter(id=>id!==m.id));setPreview(preview.filter(item=>item.medicine!==m.id));}}><Trash2 size={16} aria-hidden="true"/>{c.remove}</button>
     </details>
    </article>;
   })}</div></section>
   <section className="travel-panel"><p>{r.beforeTrip}</p><button className="travel-secondary" disabled={!selected.length} onClick={onPack}>{d.create}</button></section>
  </>}
 </>;
}
