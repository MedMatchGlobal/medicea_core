import type {SavedSearch} from '../lib/saved-searches';
import {savedSearchCopy} from '../i18n/saved-searches';
export default function SavedSearches({lang,entries,onOpen,onRemove,modeLabel}: {lang:string;entries:SavedSearch[];onOpen:(s:SavedSearch)=>void;onRemove:(id:string)=>void;modeLabel?:(s:SavedSearch)=>string}) {
 const copy=savedSearchCopy(lang);
 return <details className="saved-searches"><summary>{copy.title} ({entries.length})</summary>
  <p className="search-note">{copy.notice}</p>
  {entries.map(s=><article className="saved-search-row" key={s.id}>
   <div><strong>{s.selectedDrug}{s.selectedDosage ? ` — ${s.selectedDosage}` : ''}</strong>
    <p>{modeLabel?.(s)} · {s.originCode}{s.targetCode ? ` → ${s.targetCode}` : ''} · {s.lang.toUpperCase()} · <time dateTime={s.savedAt}>{new Date(s.savedAt).toLocaleString(lang)}</time></p></div>
   <div className="results-actions"><button onClick={()=>onOpen(s)}>{copy.open}</button><button onClick={()=>onRemove(s.id)} aria-label={`${copy.remove}: ${s.selectedDrug}`}>{copy.remove}</button></div>
  </article>)}
 </details>;
}
