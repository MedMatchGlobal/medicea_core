'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams,useRouter} from 'next/navigation';
import {ArrowRight,Check,Download,MapPin,Newspaper,Plane,Plus,Printer,ShieldCheck,Trash2} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {SUPPORTED_LANGS,type LangCode} from '../i18n/i18n';
import {travelCopy} from '../i18n/travel-demo';
import MediceaBrand from '../components/MediceaBrand';
import TravelNav from '../components/TravelNav';
import CalendarReminder from './CalendarReminder';
import HealthFeed from './HealthFeed';
import {CHECKS,DEMO_COUNTRIES,OFFICIAL_HEALTH_SOURCES,TRAVEL_DEMO_KEY,countryName,locateCountry,offlineTripHtml,readTravelDemo,validTrip,type DemoCountry,type DemoMedicine,type DemoState,type DemoTrip} from '../lib/travel-demo';

function day(offset:number){return new Date(Date.now()+offset*86400000).toISOString().slice(0,10);}
function languageName(code:string){try{return new Intl.DisplayNames([code],{type:'language'}).of(code)||code;}catch{return code;}}
export default function TravelDemo(){
 const {lang,setLang,dir}=useLanguage(),c=travelCopy(lang),query=useSearchParams(),router=useRouter();
 const tab=['trips','updates','account'].includes(query.get('tab')||'')?query.get('tab')!:'trips';
 const [state,setState]=useState<DemoState>(()=>readTravelDemo(null)),[ready,setReady]=useState(false),[creating,setCreating]=useState(false),[activeId,setActiveId]=useState('');
 const [destination,setDestination]=useState<DemoCountry>('IT'),[start,setStart]=useState(()=>day(7)),[end,setEnd]=useState(()=>day(14)),[medicines,setMedicines]=useState<DemoMedicine[]>(['A']);
 const [cardLang,setCardLang]=useState<LangCode>('it'),[status,setStatus]=useState(''),[feedView,setFeedView]=useState('destination'),[topic,setTopic]=useState('all'),[refreshAt,setRefreshAt]=useState(''),[locating,setLocating]=useState(false),[locationStatus,setLocationStatus]=useState(''),[manualDestination,setManualDestination]=useState('');
 const stateRef=useRef(state),locationVersion=useRef(0),initialAuto=useRef(false);
 const trip=state.trips.find(t=>t.id===activeId)||null,card=travelCopy(cardLang);
 useEffect(()=>{let loaded=readTravelDemo(null);try{loaded=readTravelDemo(localStorage.getItem(TRAVEL_DEMO_KEY));}catch{setStatus('saveError');}setState(loaded);stateRef.current=loaded;setActiveId(loaded.trips[0]?.id||'');setReady(true);},[]);
 useEffect(()=>{if(trip)setCardLang(trip.destination==='IT'?'it':'en');},[trip?.id]);
 useEffect(()=>()=>{locationVersion.current++;},[]);
 function commit(next:DemoState){stateRef.current=next;setState(next);try{localStorage.setItem(TRAVEL_DEMO_KEY,JSON.stringify(next));return true;}catch{setStatus('saveError');return false;}}
 async function detectCountry(){
  if(locating)return;const version=++locationVersion.current;setLocating(true);setLocationStatus('');
  try{
   if(!navigator.geolocation)throw Error('no location');
   const boundaries=await fetch('/travel-demo/countries.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('map');return r.json();});
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:300000}));
   if(version!==locationVersion.current)return;
   const code=locateCountry(position.coords.latitude,position.coords.longitude,boundaries);
   if(!code)throw Error('unknown country');
   commit({...stateRef.current,here:code});setFeedView('here');setLocationStatus('locationApprox');
  }catch{if(version===locationVersion.current)setLocationStatus('locationFailed');}finally{if(version===locationVersion.current)setLocating(false);}
 }
 useEffect(()=>{
  if(!ready||!state.autoCountry||initialAuto.current)return;initialAuto.current=true;
  navigator.permissions?.query({name:'geolocation'}).then(result=>{if(result.state==='granted')void detectCountry();else setLocationStatus('locationFailed');}).catch(()=>setLocationStatus('locationFailed'));
 },[ready,state.autoCountry]);
 function stopLocation(){locationVersion.current++;setLocating(false);initialAuto.current=true;commit({...stateRef.current,autoCountry:false});setLocationStatus('');}
 function saveTrip(event:React.FormEvent){event.preventDefault();setStatus('');const next:DemoTrip={id:crypto.randomUUID(),home:state.home,destination,start,end,medicines:[...medicines],checks:[],savedAt:new Date().toISOString()};if(!validTrip(next)){setStatus('invalidDates');return;}if(state.trips.length>=10){setStatus('saveError');return;}commit({...state,trips:[next,...state.trips]});setActiveId(next.id);setCreating(false);}
 function updateCheck(key:string,checked:boolean){if(!trip)return;commit({...state,trips:state.trips.map(t=>t.id===trip.id?{...t,checks:checked?[...new Set([...t.checks,key])]:t.checks.filter(x=>x!==key)}:t)});}
 function download(){if(!trip)return;const html=offlineTripHtml(trip,lang,c,cardLang,card);const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`medicea-demo-${trip.destination}-${trip.start}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function eraseTrip(id:string){const trips=state.trips.filter(t=>t.id!==id);commit({...state,trips});if(activeId===id)setActiveId(trips[0]?.id||'');}
 const feedCountry=feedView==='home'?state.home:feedView==='here'?state.here:manualDestination||trip?.destination||destination;
 const sourceLinks=OFFICIAL_HEALTH_SOURCES[feedCountry as DemoCountry]||[];
 function countryOptions(){return DEMO_COUNTRIES.map(code=><option key={code} value={code}>{countryName(code,lang)}</option>);}
 return <main className="travel-app" dir={dir}>
  <header className="travel-header"><Link href="/travel" aria-label="medicéa"><img src="/logo.png" alt="medicéa"/></Link><label>{c.language}<select aria-label={c.language} value={lang} onChange={e=>setLang(e.target.value as LangCode)}>{SUPPORTED_LANGS.map(l=><option key={l} value={l}>{languageName(l)}</option>)}</select></label><TravelNav active={tab}/></header>
  <aside className="travel-notice" role="note"><ShieldCheck aria-hidden="true" size={22}/><div><strong>{tab==='updates'?c.localOnly:c.demoNotice}</strong>{tab!=='updates'&&<p>{c.localOnly}</p>}</div></aside>
  {tab==='trips'&&<>
   <section className="travel-hero"><div><span className="travel-kicker" dir="ltr"><MediceaBrand/> GO</span><h1>{c.prepare}</h1><p>{c.tripPack}</p><button className="travel-primary" onClick={()=>{setCreating(true);setStatus('');}}><Plus size={18} aria-hidden="true"/>{c.createTrip}</button></div></section>
   <div className="travel-workspace">
    <aside className="travel-list"><h2>{c.trips} <small>{state.trips.length}/10</small></h2>{!state.trips.length&&<p>{c.empty}</p>}{state.trips.map(t=><article className={activeId===t.id?'selected':''} key={t.id}><button className="travel-trip-link" onClick={()=>{setActiveId(t.id);setCreating(false);}}><strong>{countryName(t.home,lang)} <ArrowRight size={16} aria-hidden="true"/> {countryName(t.destination,lang)}</strong><span>{t.start} — {t.end}</span><span>{t.medicines.length} · {c.medicines}</span></button><button className="travel-text" aria-label={`${c.remove}: ${t.start}`} onClick={()=>eraseTrip(t.id)}><Trash2 size={15} aria-hidden="true"/>{c.remove}</button></article>)}</aside>
    <div className="travel-detail">
    {(creating||!trip)&&<form className="travel-panel travel-form" onSubmit={saveTrip}><h2>{c.createTrip}</h2><div className="travel-fields"><label>{c.home}<select aria-label={c.home} value={state.home} onChange={e=>commit({...state,home:e.target.value as DemoCountry})}>{countryOptions()}</select></label><label>{c.destination}<select aria-label={c.destination} value={destination} onChange={e=>setDestination(e.target.value as DemoCountry)}>{countryOptions()}</select></label><label>{c.start}<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>{c.end}<input type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label></div><fieldset><legend>{c.medicines}</legend>{(['A','B'] as const).map(id=><label className="travel-check" key={id}><input type="checkbox" checked={medicines.includes(id)} onChange={e=>setMedicines(e.target.checked?[...medicines,id]:medicines.filter(x=>x!==id))}/><span>{c.medicine} {id}<small>{c.ingredient} {id} · {id==='A'?'10':'50'} mg · {c.tablet}</small></span></label>)}</fieldset><button className="travel-primary" disabled={!ready||!medicines.length||state.trips.length>=10} type="submit"><Plane size={18} aria-hidden="true"/>{c.saveTrip}</button></form>}
    {!creating&&trip&&<>
     <section className="travel-panel"><div className="travel-section-head"><div><span className="travel-kicker">{c.tripPack}</span><h2>{countryName(trip.destination,lang)}</h2><p>{trip.start} — {trip.end}</p></div><button className="travel-primary" onClick={download}><Download size={18} aria-hidden="true"/>{c.download}</button></div><p className="travel-caption">{c.offlineNote}</p><div className="travel-medicine-grid">{trip.medicines.map(id=><article key={id}><span className="travel-symbol">{id}</span><h3>{c.medicine} {id}</h3><p>{c.ingredient} {id} · <b>{id==='A'?'10':'50'} mg</b></p><p>{c.tablet}</p><div className="travel-match"><span>{c.equivalents}</span><strong>{c.equivalent} {id}</strong></div></article>)}</div></section>
     <section className="travel-panel"><h2>{c.checklist}</h2><div className="travel-progress"><span style={{width:`${trip.checks.length/CHECKS.length*100}%`}}/></div><p>{trip.checks.length}/{CHECKS.length}</p>{CHECKS.map(key=><label className="travel-check" key={key}><input type="checkbox" checked={trip.checks.includes(key)} onChange={e=>updateCheck(key,e.target.checked)}/><span>{c[key]}</span></label>)}<CalendarReminder key={trip.id} trip={trip} lang={lang}/></section>
     <section className="travel-panel travel-card-section"><div className="travel-section-head"><h2>{c.pharmacistCard}</h2><label>{c.cardLanguage}<select aria-label={c.cardLanguage} value={cardLang} onChange={e=>setCardLang(e.target.value as LangCode)}>{SUPPORTED_LANGS.map(l=><option key={l} value={l}>{languageName(l)}</option>)}</select></label></div><div className="travel-pharmacist" dir={['ar','he'].includes(cardLang)?'rtl':'ltr'} lang={cardLang}><MediceaBrand/><h3>{card.pharmacistCard}</h3><p>{card.cardMessage}</p><p>{countryName(trip.home,cardLang)} → {countryName(trip.destination,cardLang)}</p>{trip.medicines.map(id=><article key={id}><strong>{card.medicine} {id}</strong><dl><div><dt>{card.ingredients}</dt><dd>{card.ingredient} {id}</dd></div><div><dt>{card.strength}</dt><dd>{id==='A'?'10':'50'} mg</dd></div><div><dt>{card.form}</dt><dd>{card.tablet}</dd></div></dl></article>)}<p className="travel-caption">{card.demoNotice}</p></div><button className="travel-secondary" onClick={()=>window.print()}><Printer size={18} aria-hidden="true"/>{c.print}</button></section>
     <button className="travel-next" onClick={()=>{setFeedView('destination');router.push('/travel?tab=updates');}}><Newspaper aria-hidden="true" size={21}/>{c.updates} · {countryName(trip.destination,lang)}<ArrowRight aria-hidden="true" size={18}/></button>
    </>}
    </div>
   </div>
  </>}
  {tab==='updates'&&<>
   <section className="travel-intro"><span className="travel-kicker" dir="ltr"><MediceaBrand/> GO</span><h1>{c.updates}</h1></section>
   <section className="travel-panel"><div className="travel-segments" aria-label={c.updates}>{[['home',c.home],['destination',c.destination],['here',c.here]].map(([id,label])=><button key={id} aria-pressed={feedView===id} onClick={()=>setFeedView(id)}>{label}</button>)}</div><div className="travel-section-head"><h2>{feedCountry?countryName(feedCountry,lang):c.here}</h2><label>{c.manualCountry}<select aria-label={c.manualCountry} value={feedCountry==='GB'||feedCountry==='IT'?feedCountry:''} onChange={e=>{const code=e.target.value as DemoCountry;if(!code)return;if(feedView==='home')commit({...state,home:code});else if(feedView==='here'){stopLocation();commit({...stateRef.current,here:code,autoCountry:false});}else setManualDestination(code);}}><option value="">—</option>{countryOptions()}</select></label></div><div className="travel-location"><p>{c.locationNotice}</p><button className="travel-secondary" disabled={locating} onClick={()=>void detectCountry()}><MapPin size={18} aria-hidden="true"/>{locating?'…':c.useLocation}</button><label className="travel-check"><input type="checkbox" checked={state.autoCountry} onChange={e=>{if(!e.target.checked){stopLocation();return;}commit({...state,autoCountry:true});initialAuto.current=true;void detectCountry();}}/><span>{c.autoCountry}</span></label>{state.autoCountry&&<button className="travel-text" onClick={stopLocation}>{c.stopLocation}</button>}<p role="status">{locationStatus?c[locationStatus as keyof typeof c]:''}</p></div></section>
   <div className="travel-feed-tools"><button className="travel-secondary" onClick={()=>setRefreshAt(String(Date.now()))}>{c.refresh}</button></div>
   <HealthFeed country={feedCountry} lang={lang} topic={topic} refresh={refreshAt}/>
   <section className="travel-panel"><h2>{c.officialSources}</h2><div className="travel-sources">{[...sourceLinks,{name:'WHO',url:'https://www.who.int/emergencies/disease-outbreak-news/'},{name:'ECDC',url:'https://www.ecdc.europa.eu/en/rss-feeds'}].map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.name} · {c.readOriginal} ↗</a>)}</div></section>
  </>}
  {tab==='account'&&<section className="travel-panel travel-account"><span className="travel-kicker" dir="ltr"><MediceaBrand/> GO</span><h1>{c.account}</h1><p className="travel-access"><Check size={20} aria-hidden="true"/>{c.demoAccess}</p><p>{c.localOnly}</p><dl><div><dt>{c.trips}</dt><dd>{state.trips.length}</dd></div><div><dt>{c.home}</dt><dd>{countryName(state.home,lang)}</dd></div><div><dt>{c.language}</dt><dd>{languageName(lang)}</dd></div></dl><button className="travel-secondary" onClick={()=>{locationVersion.current++;setLocating(false);try{localStorage.removeItem(TRAVEL_DEMO_KEY);}catch{}const cleared=readTravelDemo(null);setState(cleared);stateRef.current=cleared;setActiveId('');setCreating(false);setDestination('IT');setStart(day(7));setEnd(day(14));setMedicines(['A']);setManualDestination('');setFeedView('destination');setTopic('all');setStatus('');setLocationStatus('');}}><Trash2 size={18} aria-hidden="true"/>{c.reset}</button></section>}
  <p className="travel-status" role="status">{status?c[status as keyof typeof c]:''}</p><footer className="travel-footer"><MediceaBrand/> · {tab==='updates'?c.localOnly:c.demoNotice}</footer>
 </main>;
}
