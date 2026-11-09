'use client';
import {useEffect,useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {Phone} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {currentEmergencyLocation,lookupEmergencyCountry,type EmergencyLocation,EMERGENCY_COUNTRIES,emergencyNumber,emergencySource} from '../lib/emergency';

const EN = {
  button:'Emergency', title:'Emergency help', intro:'For an immediate threat to life or safety, use your phone’s emergency call / SOS function now. Do not wait for GPS or this app.',
  country:'Country you are physically in', choose:'Choose your current country', other:'Other country / not listed',
  gps:'Use my current location', consent:'Optional: Locate asks for your device location and sends coordinates and your IP address to BigDataCloud to suggest a country; they use these signals to improve location data. If GPS is unavailable, IP gives only a rough country suggestion. Street lookup sends coordinates through Medicea to Google Maps when available. We do not save the location in your account. You can select your country instead.',
  locating:'Checking location…', failure:'We could not confirm your country. Select it below, or use your phone’s emergency call / SOS function.',
  confirm:'Check the country is correct before calling, especially near a border. This opens your phone dialler; it does not send your location to emergency services.',
  call:'Call', source:'Official number information', close:'Close', unknown:'We do not have a verified number for this country. Use your phone’s emergency call / SOS function, or ask someone nearby for the local number.',
};
const IT: typeof EN = {
  button:'Emergenza', title:'Aiuto in emergenza', intro:'In caso di pericolo immediato per la vita o la sicurezza, usa subito la chiamata di emergenza / SOS del telefono. Non aspettare il GPS o questa app.',
  country:'Paese in cui ti trovi fisicamente', choose:'Scegli il paese in cui ti trovi', other:'Altro paese / non in elenco',
  gps:'Usa la mia posizione attuale', consent:'Facoltativo: richiede la posizione del dispositivo e invia coordinate e IP a BigDataCloud, che li usa per migliorare la geolocalizzazione. Senza GPS, l’IP suggerisce solo un paese approssimativo. Per la strada, le coordinate passano tramite Medicea a Google Maps, se disponibile. Non salviamo la posizione nel tuo account. Puoi scegliere il paese manualmente.',
  locating:'Verifica della posizione…', failure:'Non è stato possibile confermare il paese. Selezionalo qui sotto oppure usa la chiamata di emergenza / SOS del telefono.',
  confirm:'Controlla il paese prima di chiamare, soprattutto vicino a un confine. Si apre il tastierino del telefono: la tua posizione non viene inviata ai soccorsi.',
  call:'Chiama', source:'Informazioni ufficiali sul numero', close:'Chiudi', unknown:'Non abbiamo un numero verificato per questo paese. Usa la chiamata di emergenza / SOS del telefono o chiedi il numero locale a qualcuno vicino a te.',
};
export default function EmergencyHelp() {
  const {lang}=useLanguage(); const c=lang==='it'?IT:EN;
  const [open,setOpen]=useState(false),[country,setCountry]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [location,setLocation]=useState<EmergencyLocation|null>(null),[address,setAddress]=useState<string|null>(null),[source,setSource]=useState<'gps'|'ip'|null>(null),[confirmed,setConfirmed]=useState(false);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  const number=emergencyNumber(country);
  const names=new Intl.DisplayNames([lang],{type:'region'});
  const options=EMERGENCY_COUNTRIES.map(code=>({code,name:names.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,lang));
  function cancel(){pending.current?.abort();pending.current=null;setBusy(false);}
  function changeOpen(value:boolean){cancel();setOpen(value);setCountry('');setError(false);setLocation(null);setAddress(null);setSource(null);setConfirmed(false);}
  async function locate(){
    cancel();setCountry('');setError(false);setLocation(null);setAddress(null);setSource(null);setConfirmed(false);setBusy(true);
    const controller=new AbortController();pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),18000);
    const current=()=>pending.current===controller&&!controller.signal.aborted;
    try {
      let coords:EmergencyLocation|null=null;
      try{if(navigator.geolocation)coords=await currentEmergencyLocation(navigator.geolocation,controller.signal);}catch{if(controller.signal.aborted)throw Error('Cancelled');}
      if(!current())return;
      setLocation(coords);setSource(coords?'gps':'ip');
      const street=coords?fetch('/api/emergency/address',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:coords.latitude,longitude:coords.longitude}),cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{if(current())setAddress(typeof data?.address==='string'?data.address:null);}).catch(()=>{}):Promise.resolve();
      try{
        const detected=await lookupEmergencyCountry(fetch,coords,controller.signal);
        if(current())setCountry(EMERGENCY_COUNTRIES.includes(detected)?detected:'other');
      }finally{await street;}
    }catch{if(pending.current===controller)setError(true);}
    finally{clearTimeout(timer);if(pending.current===controller){pending.current=null;setBusy(false);}}
  }
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger className="emergency-trigger" aria-label={c.title}><Phone size={18} aria-hidden="true"/>SOS</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="emergency-overlay"/><Dialog.Content className="emergency-dialog" lang={lang==='it'?'it':'en'} dir="ltr">
      <Dialog.Title>{c.title}</Dialog.Title><Dialog.Description>{c.intro}</Dialog.Description>
      <label htmlFor="emergency-country">{c.country}</label>
      <select id="emergency-country" value={country} onChange={e=>{cancel();setError(false);setSource(null);setConfirmed(false);setCountry(e.target.value);}}>
        <option value="">{c.choose}</option>{options.map(o=><option key={o.code} value={o.code}>{o.name}</option>)}<option value="other">{c.other}</option>
      </select>
      {source==='ip'&&<label className="emergency-ip-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{lang==='it'?'Paese suggerito dall’IP: può essere errato con VPN o roaming. Confermo di trovarmi nel paese selezionato.':'IP country suggestion: VPNs and roaming can make it wrong. I confirm I am in the selected country.'}</label>}
      {number&&(source!=='ip'||confirmed)&&<div className="emergency-number"><p>{c.confirm}</p><a className="emergency-call" href={`tel:${number}`}>{c.call} {number}</a><a href={emergencySource(country)} target="_blank" rel="noopener noreferrer">{c.source}</a></div>}
      {country==='other'&&<p role="status">{c.unknown}</p>}
      {location&&<section className="emergency-location" aria-label={lang==='it'?'La tua posizione':'Your location'}>
        <strong>{lang==='it'?'Posizione del dispositivo':'Device location'}</strong>
        <p><bdi>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</bdi>{location.accuracy!==null?` · ±${Math.ceil(location.accuracy)} m`:''}</p>
        <p>{lang==='it'?'Strada vicina (da verificare):':'Nearby street (please verify):'} {address||(lang==='it'?'Indirizzo non disponibile. Comunica le coordinate.':'Address unavailable. Read out the coordinates instead.')}</p>
        {address&&<small>Google Maps</small>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`} target="_blank" rel="noopener noreferrer">{lang==='it'?'Controlla sulla mappa':'Check on map'}</a>
        <p>{lang==='it'?'Stima, non una posizione esatta garantita. Non viene inviata ai soccorsi.':'This is an estimate, not a guaranteed exact location. It is not sent to emergency services.'}</p>
      </section>}
      <p className="emergency-consent">{c.consent} <a href="https://www.bigdatacloud.com/privacy-policy" target="_blank" rel="noopener noreferrer">BigDataCloud privacy</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google privacy</a></p>
      <button type="button" disabled={busy} onClick={locate}>{busy?c.locating:c.gps}</button>
      <p role="status" aria-live="polite">{error?c.failure:busy?c.locating:''}</p>
      <Dialog.Close className="emergency-close">{c.close}</Dialog.Close>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
