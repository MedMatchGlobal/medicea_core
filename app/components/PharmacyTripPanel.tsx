'use client';
import {useState} from 'react';
import type {PharmacyTrip} from '../lib/pharmacy-trip';
import {pharmacyTripCopy} from '../i18n/pharmacy-trip';
import {careSearchQuery} from '../lib/care-search';
export default function PharmacyTripPanel({trip, lang, onBack, title, addressLabel, addressPlaceholder, useLocationLabel, openLabel, notice, onSave, saveLabel}: {
  trip:PharmacyTrip; lang:string; onBack:()=>void; title:string; addressLabel:string;
  addressPlaceholder:string; useLocationLabel:string; openLabel:string; notice:string;onSave?:()=>void;saveLabel?:string;
}) {
  const [address,setAddress]=useState(trip.country);
  const [useLocation,setUseLocation]=useState(false);
  const [coordinates,setCoordinates]=useState('');
  const copy=pharmacyTripCopy(lang);
  function locate(enabled:boolean) {
    setUseLocation(enabled); setCoordinates('');
    if (enabled && navigator.geolocation) navigator.geolocation.getCurrentPosition(
      position=>setCoordinates(`${position.coords.latitude},${position.coords.longitude}`),
      ()=>setCoordinates('near me'),{maximumAge:60000,timeout:8000});
    else if (enabled) setCoordinates('near me');
  }
  const location=useLocation ? coordinates : address.trim();
  return <section className="pharmacy-trip-panel" aria-label={title}>
    <button type="button" className="clear-search" onClick={onBack}>← {copy.back}</button>
    <div className="pharmacy-reminder"><strong>{copy.reminder}</strong>
      <ul>{trip.medicines.map(name=><li key={name}>{name}</li>)}</ul>
    </div>
    {onSave && <button type="button" className="clear-search" onClick={onSave}>{saveLabel}</button>}
    <h2>{title}</h2>
    <label>{addressLabel}<input type="text" maxLength={250} placeholder={addressPlaceholder}
      value={address} onChange={event=>setAddress(event.target.value)} /></label>
    <label className="pharmacy-location-choice"><input type="checkbox" checked={useLocation} onChange={event=>locate(event.target.checked)} />{useLocationLabel}</label>
    {location ? <a className="pill pill--blue pharmacy-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(careSearchQuery('pharmacy',location))}`} target="_blank" rel="noopener noreferrer">{openLabel} ↗</a>
      : <button type="button" className="pill pill--blue" disabled>{openLabel}</button>}
    <p className="search-note">{notice}</p>
  </section>;
}
