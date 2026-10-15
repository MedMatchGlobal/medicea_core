'use client';
import {useEffect,useState} from 'react';
import {travelNextCopy} from '../i18n/travel-next';
import {travelCopy} from '../i18n/travel-demo';
import type {HealthNotice} from '../lib/travel-news';
export default function HealthFeed({country,lang,topic,refresh}:{country:string;lang:string;topic:string;refresh:string}){
 const [result,setResult]=useState<{status:string;items:HealthNotice[]}>({status:'loading',items:[]}),c=travelCopy(lang),n=travelNextCopy(lang);
 useEffect(()=>{
  const controller=new AbortController();let running=false;
  async function load(){if(running||controller.signal.aborted)return;running=true;try{const response=await fetch('/api/travel-news?country='+encodeURIComponent(country),{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('unavailable');const data=await response.json();if(!controller.signal.aborted)setResult(data);}catch{if(!controller.signal.aborted)setResult({status:'unavailable',items:[]});}finally{running=false;}}
  setResult({status:'loading',items:[]});void load();const timer=setInterval(()=>void load(),600000);return()=>{controller.abort();clearInterval(timer);};
 },[country,refresh]);
 // Do not briefly show the previous country's notices while switching filters.
 if(country!=='GB')return <div className="travel-panel" role="status">{n.feedUnsupported}</div>;
 const items=topic==='all'||topic==='newsMedicine'?result.items:[];
 return <><aside className="travel-panel"><p>{n.feedPilot}</p><p className="travel-caption">Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Open Government Licence v3.0</a>. © Crown copyright.</p></aside><section className="travel-feed" aria-label={c.updates} aria-busy={result.status==='loading'}>
 {result.status==='loading'?<p role="status">…</p>:result.status!=='ok'?<p className="travel-panel" role="status">{n.feedUnavailable}</p>:!items.length?<p className="travel-panel">{c.updates}: 0</p>:items.map(item=><article key={item.url} className="travel-panel"><span className="travel-badge">{item.source} · UK</span><h2 lang={item.language} dir="ltr">{item.title}</h2><time dateTime={item.published}>{new Date(item.published).toLocaleDateString(lang,{year:'numeric',month:'short',day:'numeric'})}</time><p><a href={item.url} target="_blank" rel="noopener noreferrer">{c.readOriginal} ↗</a></p></article>)}
 </section></>;
}
