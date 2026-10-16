'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from '../LanguageProvider';
import {connectedCopy} from '../i18n/travel-connected';
import {matchingFeedback} from '../i18n/matching-feedback';
import {CONNECTED_TRAVEL_KEY} from '../lib/travel-connected';
import TravelHeader from '../components/TravelHeader';
import CoastalBanner from '../components/CoastalBanner';
import TravelDemo from './preview';
import {connectedRequest} from './ConnectedMedicineLibrary';
export default function ConnectedGate(){
 const {lang,dir}=useLanguage(),c=connectedCopy(lang),[status,setStatus]=useState<{ready:boolean;missing:string[];authenticated:boolean}|null>(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/travel-live',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(v=>setStatus(v||{ready:false,missing:[],authenticated:false})).catch(()=>{if(!controller.signal.aborted)setError(matchingFeedback(lang).failed);});const expired=()=>setStatus(v=>v?{...v,authenticated:false}:v);window.addEventListener('travel-test-expired',expired);return()=>{controller.abort();window.removeEventListener('travel-test-expired',expired);};},[]);
 async function unlock(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const {response}=await connectedRequest({action:'unlock',code});setCode('');if(!response.ok){setError(matchingFeedback(lang).failed);return;}setStatus(v=>v?{...v,authenticated:true}:v);}catch{setError(matchingFeedback(lang).failed);}finally{setBusy(false);}}
 async function end(){setBusy(true);try{const {response}=await connectedRequest({action:'signout'});if(!response.ok)throw Error('signout');try{sessionStorage.removeItem(CONNECTED_TRAVEL_KEY);}catch{}setStatus(v=>v?{...v,authenticated:false}:v);}catch{setError(matchingFeedback(lang).failed);}finally{setBusy(false);}}
 if(status?.authenticated)return <TravelDemo connected onEndSession={()=>void end()}/>;
 return <main className="travel-app" dir={dir}><TravelHeader active="account"/><CoastalBanner title={c.title}/><section className="travel-panel"><p className="travel-review-due">{c.notice}</p><p>{c.session}</p>{!status?<p role="status">…</p>:!status.ready?<><h2>{c.setup}</h2><ul>{status.missing.map(key=><li key={key}><code>{key}</code></li>)}</ul></>:<form className="travel-unlock" onSubmit={unlock}><label>{c.code}<input type="password" autoComplete="off" required maxLength={200} value={code} onChange={e=>setCode(e.target.value)}/></label><button className="travel-primary" disabled={busy}>{c.unlock}</button></form>}{error&&<p role="alert">{error}</p>}</section></main>;
}
