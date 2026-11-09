'use client';
import {useEffect,useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {Phone} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {detectEmergencyCountry,EMERGENCY_COUNTRIES,emergencyNumber,emergencySource} from '../lib/emergency';

const EN = {
  button:'Emergency', title:'Emergency help', intro:'For an immediate threat to life or safety, use your phone’s emergency call / SOS function now. Do not wait for GPS or this app.',
  country:'Country you are physically in', choose:'Choose your current country', other:'Other country / not listed',
  gps:'Use my current location', consent:'Optional: this sends your current GPS coordinates and IP address to BigDataCloud to suggest your country. They use these signals to improve their location data. Medicea does not save your coordinates. You can select your country instead.',
  locating:'Checking location…', failure:'We could not confirm your country. Select it below, or use your phone’s emergency call / SOS function.',
  confirm:'Check the country is correct before calling, especially near a border. This opens your phone dialler; it does not send your location to emergency services.',
  call:'Call', source:'Official number information', close:'Close', unknown:'We do not have a verified number for this country. Use your phone’s emergency call / SOS function, or ask someone nearby for the local number.',
};
const IT: typeof EN = {
  button:'Emergenza', title:'Aiuto in emergenza', intro:'In caso di pericolo immediato per la vita o la sicurezza, usa subito la chiamata di emergenza / SOS del telefono. Non aspettare il GPS o questa app.',
  country:'Paese in cui ti trovi fisicamente', choose:'Scegli il paese in cui ti trovi', other:'Altro paese / non in elenco',
  gps:'Usa la mia posizione attuale', consent:'Facoltativo: invia le coordinate GPS attuali e il tuo indirizzo IP a BigDataCloud per suggerire il paese. Il servizio usa questi dati per migliorare la geolocalizzazione. Medicea non salva le coordinate. Puoi scegliere il paese manualmente.',
  locating:'Verifica della posizione…', failure:'Non è stato possibile confermare il paese. Selezionalo qui sotto oppure usa la chiamata di emergenza / SOS del telefono.',
  confirm:'Controlla il paese prima di chiamare, soprattutto vicino a un confine. Si apre il tastierino del telefono: la tua posizione non viene inviata ai soccorsi.',
  call:'Chiama', source:'Informazioni ufficiali sul numero', close:'Chiudi', unknown:'Non abbiamo un numero verificato per questo paese. Usa la chiamata di emergenza / SOS del telefono o chiedi il numero locale a qualcuno vicino a te.',
};
export default function EmergencyHelp() {
  const {lang,t}=useLanguage(); const c=lang==='it'?IT:EN;
  const [open,setOpen]=useState(false),[country,setCountry]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  const number=emergencyNumber(country);
  const names=new Intl.DisplayNames([lang],{type:'region'});
  const options=EMERGENCY_COUNTRIES.map(code=>({code,name:names.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name,lang));
  function cancel(){pending.current?.abort();pending.current=null;setBusy(false);}
  function changeOpen(value:boolean){cancel();setOpen(value);setCountry('');setError(false);}
  async function locate(){
    cancel();setCountry('');setError(false);setBusy(true);
    const controller=new AbortController();pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),10000);
    try {
      if(!navigator.geolocation)throw new Error('No location');
      const detected=await detectEmergencyCountry(navigator.geolocation,fetch,controller.signal);
      if(pending.current===controller&&!controller.signal.aborted)setCountry(EMERGENCY_COUNTRIES.includes(detected)?detected:'other');
    }catch{if(pending.current===controller)setError(true);}
    finally{clearTimeout(timer);if(pending.current===controller){pending.current=null;setBusy(false);}}
  }
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger className="emergency-trigger"><Phone size={18} aria-hidden="true"/>{t?.ui?.emergencyButton || c.button}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="emergency-overlay"/><Dialog.Content className="emergency-dialog" lang={lang==='it'?'it':'en'} dir="ltr">
      <Dialog.Title>{c.title}</Dialog.Title><Dialog.Description>{c.intro}</Dialog.Description>
      <label htmlFor="emergency-country">{c.country}</label>
      <select id="emergency-country" value={country} onChange={e=>{cancel();setError(false);setCountry(e.target.value);}}>
        <option value="">{c.choose}</option>{options.map(o=><option key={o.code} value={o.code}>{o.name}</option>)}<option value="other">{c.other}</option>
      </select>
      {number&&<div className="emergency-number"><p>{c.confirm}</p><a className="emergency-call" href={`tel:${number}`}>{c.call} {number}</a><a href={emergencySource(country)} target="_blank" rel="noopener noreferrer">{c.source}</a></div>}
      {country==='other'&&<p role="status">{c.unknown}</p>}
      <p className="emergency-consent">{c.consent} <a href="https://www.bigdatacloud.com/privacy-policy" target="_blank" rel="noopener noreferrer">BigDataCloud privacy</a></p>
      <button type="button" disabled={busy} onClick={locate}>{busy?c.locating:c.gps}</button>
      <p role="status" aria-live="polite">{error?c.failure:busy?c.locating:''}</p>
      <Dialog.Close className="emergency-close">{c.close}</Dialog.Close>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
