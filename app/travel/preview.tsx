'use client';
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Check,MapPin,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {travelCopy} from '../i18n/travel-demo';
import {addressCopy} from '../i18n/travel-address';
import {libraryCopy} from '../i18n/medicine-library';
import MedicineLibrary from './MedicineLibrary';
import {destinationCopy} from '../i18n/destination-packs';
import DestinationWorkspace,{type PackFocus} from './DestinationWorkspace';
import MediceaBrand from '../components/MediceaBrand';
import TravelHeader from '../components/TravelHeader';
import CoastalBanner from '../components/CoastalBanner';
import HealthFeed from './HealthFeed';
import {DEMO_COUNTRIES,OFFICIAL_HEALTH_SOURCES,TRAVEL_DEMO_KEY,countryName,locateCountry,readTravelDemo,suggestHomeRegion,type DemoCountry,type DemoMedicine,type DemoState} from '../lib/travel-demo';

function languageName(code:string){try{return new Intl.DisplayNames([code],{type:'language'}).of(code)||code;}catch{return code;}}
export default function TravelDemo(){
 const {lang,dir}=useLanguage(),n=libraryCopy(lang),d=destinationCopy(lang),c={...travelCopy(lang),updates:n.news,trips:d.packs,originCountryLabel:n.origin,notComparedLabel:n.notCompared,sourceLabel:n.source,checkedLabel:n.checked},query=useSearchParams();
 const tab=['medicines','trips','updates','account'].includes(query.get('tab')||'')?query.get('tab')!:'medicines';
 const [state,setState]=useState<DemoState>(()=>readTravelDemo(null)),[ready,setReady]=useState(false),[createRequested,setCreateRequested]=useState(false),[packFocus,setPackFocus]=useState<PackFocus|null>(null);
 const [destination,setDestination]=useState<DemoCountry>('IT'),[selected,setSelected]=useState<DemoMedicine[]>([]),[homeDraft,setHomeDraft]=useState<DemoCountry|''>('');
 const [homeExpanded,setHomeExpanded]=useState(false),[newsExpanded,setNewsExpanded]=useState(false);
 const [status,setStatus]=useState(''),[feedView,setFeedView]=useState('home'),[topic,setTopic]=useState('all'),[refreshAt,setRefreshAt]=useState(''),[locating,setLocating]=useState(false),[locationStatus,setLocationStatus]=useState('');
 const stateRef=useRef(state),locationVersion=useRef(0),initialAuto=useRef(false);
 useEffect(()=>{let loaded=readTravelDemo(null),stored:string|null=null;try{stored=localStorage.getItem(TRAVEL_DEMO_KEY);loaded=readTravelDemo(stored);}catch{setStatus('saveError');}setState(loaded);setHomeExpanded(!loaded.homeConfirmed);stateRef.current=loaded;setSelected(loaded.library.map(m=>m.id));setHomeDraft(stored?loaded.home:suggestHomeRegion(navigator.languages||[navigator.language]));setReady(true);},[]);
 const queryCountry=query.get('country');
 useEffect(()=>{if(DEMO_COUNTRIES.includes(queryCountry as DemoCountry))setDestination(queryCountry as DemoCountry);},[queryCountry]);
 useEffect(()=>{if(ready)setHomeDraft(state.home);},[state.home]);
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
   commit({...stateRef.current,here:code,otherCountry:code});setFeedView('other');setLocationStatus('locationApprox');setNewsExpanded(false);
  }catch{if(version===locationVersion.current)setLocationStatus('locationFailed');}finally{if(version===locationVersion.current)setLocating(false);}
 }
 useEffect(()=>{
  if(!ready||!state.autoCountry||initialAuto.current)return;initialAuto.current=true;
  navigator.permissions?.query({name:'geolocation'}).then(result=>{if(result.state==='granted')void detectCountry();else setLocationStatus('locationFailed');}).catch(()=>setLocationStatus('locationFailed'));
 },[ready,state.autoCountry]);
 function stopLocation(){locationVersion.current++;setLocating(false);initialAuto.current=true;commit({...stateRef.current,autoCountry:false});setLocationStatus('');}
 const feedCountry=feedView==='home'?(state.homeConfirmed?state.home:''):state.otherCountry;
 function goTab(tab:string){window.history.pushState(null,'','/travel?tab='+tab);window.scrollTo({top:0,behavior:'instant'});}
 function preparePack(){setCreateRequested(true);setStatus('');goTab('trips');}
 const sourceLinks=OFFICIAL_HEALTH_SOURCES[feedCountry as DemoCountry]||[];
 function countryOptions(){return DEMO_COUNTRIES.map(code=><option key={code} value={code}>{countryName(code,lang)}</option>);}
 return <main className="travel-app" dir={dir}>
  <TravelHeader active={tab}/>
  <CoastalBanner title={tab==='medicines'?n.mine:c[tab as 'trips'|'updates'|'account']}/>
  <aside className="travel-notice" role="note"><ShieldCheck aria-hidden="true" size={22}/><div><strong>{tab==='updates'?c.localOnly:c.demoNotice}</strong>{tab!=='updates'&&<p>{c.localOnly}</p>}</div></aside>
  {ready&&(!state.homeConfirmed||tab==='account')&&<details className="travel-panel travel-disclosure travel-home-settings" open={homeExpanded} onToggle={e=>setHomeExpanded(e.currentTarget.open)}><summary><span>{c.home}</span><strong>{state.homeConfirmed?countryName(state.home,lang):'—'}</strong></summary><form onSubmit={event=>{event.preventDefault();if(!homeDraft)return;if(commit({...state,home:homeDraft,homeConfirmed:true,otherCountry:state.otherCountry===homeDraft?(homeDraft==='GB'?'IT':'GB'):state.otherCountry})){setHomeExpanded(false);event.currentTarget.closest('details')?.querySelector('summary')?.focus();}}}><p>{state.homeConfirmed?addressCopy(lang).homeNote:n.homePrompt}</p><div className="travel-home-controls"><label>{c.home}<select aria-label={c.home} required value={homeDraft} onChange={e=>setHomeDraft(e.target.value as DemoCountry)}><option value="">—</option>{countryOptions()}</select></label><button className="travel-secondary" type="submit">{n.confirmHome}</button></div></form></details>}
  {tab==='medicines'&&ready&&state.homeConfirmed&&<MedicineLibrary state={state} commit={commit} lang={lang} selected={selected} setSelected={setSelected} destination={destination} setDestination={setDestination} onPack={preparePack} openMedicine={['A','B'].includes(query.get('medicine')||'')?query.get('medicine') as DemoMedicine:undefined} backToPack={['pack','trip'].includes(query.get('returnKind')||'')&&query.get('returnId')?()=>{setPackFocus({kind:query.get('returnKind') as 'pack'|'trip',id:query.get('returnId')!});goTab('trips');}:undefined}/>}
  {tab==='medicines'&&['pack','trip'].includes(query.get('returnKind')||'')&&query.get('returnId')&&<button className="travel-secondary" onClick={()=>{setPackFocus({kind:query.get('returnKind') as 'pack'|'trip',id:query.get('returnId')!});goTab('trips');}}>{c.back} · {d.packs}</button>}
  {tab==='trips'&&ready&&<DestinationWorkspace state={state} commit={commit} lang={lang} selected={selected} initialCountry={destination} createRequested={createRequested} onConsumed={()=>setCreateRequested(false)} focus={packFocus} onFocus={setPackFocus} onLibrary={()=>goTab('medicines')} onMedicine={(id,country,back)=>{setDestination(country);setPackFocus(back);window.history.pushState(null,'',`/travel?tab=medicines&medicine=${id}&country=${country}&returnKind=${back.kind}&returnId=${encodeURIComponent(back.id)}`);window.scrollTo({top:0,behavior:'instant'});}} onNews={country=>{commit({...state,otherCountry:country});setFeedView('other');goTab('updates');}}/>}
  {tab==='updates'&&<>
   <div className="travel-news-toolbar"><details className="travel-panel travel-disclosure travel-news-settings" open={newsExpanded} onToggle={e=>setNewsExpanded(e.currentTarget.open)}><summary><span>{feedView==='home'?c.home:n.other}</span><strong>{feedCountry?countryName(feedCountry,lang):'—'}</strong></summary><p className="travel-caption">{n.newsSubtitle}</p><div className="travel-segments" aria-label={n.news}>{[['home',c.home],['other',n.other]].map(([id,label])=><button key={id} aria-pressed={feedView===id} onClick={()=>setFeedView(id)}>{label}</button>)}</div><div className="travel-section-head"><h2>{feedCountry?countryName(feedCountry,lang):c.home}</h2>{(feedView!=='home'||state.homeConfirmed)&&<label>{feedView==='home'?c.home:n.other}<select aria-label={feedView==='home'?c.home:n.other} value={feedCountry} onChange={e=>{const code=e.target.value as DemoCountry;if(!code)return;if(feedView==='home')commit({...state,home:code,homeConfirmed:true});else {stopLocation();commit({...stateRef.current,otherCountry:code});}setNewsExpanded(false);e.currentTarget.closest('details')?.querySelector('summary')?.focus();}}><option value="">—</option>{feedCountry&&!DEMO_COUNTRIES.includes(feedCountry as DemoCountry)&&<option value={feedCountry}>{countryName(feedCountry,lang)}</option>}{countryOptions()}</select></label>}</div><div className="travel-location"><p>{c.locationNotice}</p><button className="travel-secondary" disabled={locating} onClick={()=>void detectCountry()}><MapPin size={18} aria-hidden="true"/>{locating?'…':c.useLocation}</button><label className="travel-check"><input type="checkbox" checked={state.autoCountry} onChange={e=>{if(!e.target.checked){stopLocation();return;}commit({...state,autoCountry:true});initialAuto.current=true;void detectCountry();}}/><span>{c.autoCountry}</span></label>{state.autoCountry&&<button className="travel-text" onClick={stopLocation}>{c.stopLocation}</button>}<p role="status">{locationStatus?c[locationStatus as keyof typeof c]:''}</p></div></details><button className="travel-secondary travel-feed-refresh" aria-label={c.refresh} title={c.refresh} onClick={()=>setRefreshAt(String(Date.now()))}><RefreshCw size={18} aria-hidden="true"/></button></div>{!newsExpanded&&locationStatus&&<p className="travel-caption" role="status">{c[locationStatus as keyof typeof c]}</p>}
   {feedCountry&&<HealthFeed country={feedCountry} lang={lang} topic={topic} refresh={refreshAt}/>}
   <details className="travel-panel travel-disclosure"><summary>{c.officialSources}</summary><div className="travel-sources">{[...sourceLinks,{name:'WHO',url:'https://www.who.int/emergencies/disease-outbreak-news/'},{name:'ECDC',url:'https://www.ecdc.europa.eu/en/rss-feeds'}].map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.name} · {c.readOriginal} ↗</a>)}</div></details>
  </>}
  {tab==='account'&&<section className="travel-panel travel-account"><p className="travel-access"><Check size={20} aria-hidden="true"/>{c.demoAccess}</p><p>{c.localOnly}</p><dl><div><dt>{n.mine}</dt><dd>{state.library.length}</dd></div><div><dt>{d.packs}</dt><dd>{state.packs.length}</dd></div><div><dt>{d.journeys}</dt><dd>{state.trips.length}</dd></div><div><dt>{c.home}</dt><dd>{countryName(state.home,lang)}</dd></div><div><dt>{c.language}</dt><dd>{languageName(lang)}</dd></div></dl><button className="travel-secondary" onClick={()=>{locationVersion.current++;setLocating(false);try{localStorage.removeItem(TRAVEL_DEMO_KEY);}catch{}const cleared=readTravelDemo(null);setState(cleared);stateRef.current=cleared;setPackFocus(null);setCreateRequested(false);setDestination('IT');setSelected([]);setHomeDraft(suggestHomeRegion(navigator.languages||[navigator.language]));setHomeExpanded(true);setFeedView('home');setTopic('all');setStatus('');setLocationStatus('');}}><Trash2 size={18} aria-hidden="true"/>{c.reset}</button></section>}
  <p className="travel-status" role="status">{status?c[status as keyof typeof c]:''}</p><footer className="travel-footer"><MediceaBrand/> · {tab==='updates'?c.localOnly:c.demoNotice}</footer>
 </main>;
}
