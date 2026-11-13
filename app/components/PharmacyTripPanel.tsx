'use client';
import {useState} from 'react';
import type {PharmacyTrip} from '../lib/pharmacy-trip';
import {pharmacyTripCopy} from '../i18n/pharmacy-trip';
import {careSearchUrl,careLaunchUrl} from '../lib/care-search';
import {useCareLocation} from './useCareLocation';
import CareLocationStatus,{careLocationCopy} from './CareLocationStatus';
export default function PharmacyTripPanel({trip, lang, onBack, title, addressLabel, addressPlaceholder, useLocationLabel, openLabel, notice, onSave, saveLabel}: {
  trip:PharmacyTrip; lang:string; onBack:()=>void; title:string; addressLabel:string;
  addressPlaceholder:string; useLocationLabel:string; openLabel:string; notice:string;onSave?:()=>void;saveLabel?:string;
}) {
  const [address,setAddress]=useState(trip.country);
  const [useLocation,setUseLocation]=useState(false);
  const geo=useCareLocation(useLocation);
  const copy=pharmacyTripCopy(lang);
  const location=useLocation ? geo.coordinates : address.trim();
  const mapsHref=careSearchUrl(trip.service||'pharmacy',location);
  return <section className="pharmacy-trip-panel" aria-label={title}>
    <button type="button" className="clear-search" onClick={onBack}>← {copy.back}</button>
    <div className="pharmacy-reminder"><strong>{copy.reminder}</strong>
      <ul>{trip.medicines.map(name=><li key={name}>{name}</li>)}</ul>
    </div>
    {onSave && <button type="button" className="clear-search" onClick={onSave}>{saveLabel}</button>}
    <h2>{title}</h2>
    <label>{addressLabel}<input type="text" maxLength={250} placeholder={addressPlaceholder}
      value={address} disabled={useLocation} onChange={event=>setAddress(event.target.value)} /></label>
    <label className="pharmacy-location-choice"><input type="checkbox" checked={useLocation} onChange={event=>setUseLocation(event.target.checked)} />{useLocationLabel}</label>
    <CareLocationStatus enabled={useLocation} {...geo} lang={lang}/>
    {mapsHref ? <a className="pill pill--blue pharmacy-map-link" href={mapsHref} target="_blank" rel="noopener noreferrer" onClick={event=>{const launch=careLaunchUrl(trip.service||'pharmacy',location,'',navigator.userAgent);if(launch?.startsWith('geo:')){event.preventDefault();window.location.assign(launch);}}}>{openLabel} ↗</a>
      : <button type="button" className="pill pill--blue" disabled aria-busy={useLocation&&geo.pending}>{useLocation&&geo.pending?careLocationCopy(lang).pending:openLabel}</button>}
    {useLocation&&mapsHref&&<p className="search-note"><a href={mapsHref} target="_blank" rel="noopener noreferrer">{lang==='it'?'Apri la mappa nel browser':'Open browser map'}</a></p>}
    <p className="search-note">{notice}</p>
  </section>;
}
