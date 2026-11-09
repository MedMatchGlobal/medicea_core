'use client';

import {useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ArrowRight, ArrowLeftRight, Bookmark, Check, ChevronDown, FileText, HeartPulse, MapPin, Pill, PawPrint, Search, Stethoscope, Volume2, X, RotateCw, Maximize2, UserRound} from 'lucide-react';
import styles from './preview.module.css';

const destinations = {
  IT: {name:'Italy', language:'Italian', phrase:'Buongiorno, vorrei chiedere informazioni sul paracetamolo da 500 mg in compresse.', pharmacy:'farmacia', gp:'medico di medicina generale'},
  FR: {name:'France', language:'French', phrase:'Bonjour, je voudrais des renseignements sur le paracétamol 500 mg en comprimés.', pharmacy:'pharmacie', gp:'médecin généraliste'},
  ES: {name:'Spain', language:'Spanish', phrase:'Buenos días, quisiera información sobre paracetamol de 500 mg en comprimidos.', pharmacy:'farmacia', gp:'médico de atención primaria'},
};
type Destination = keyof typeof destinations;

export default function RivieraPreview(){
  const [destination,setDestination]=useState<Destination>('IT');
  const [result,setResult]=useState(false),[saved,setSaved]=useState(false),[prescription,setPrescription]=useState(false);
  const [translation,setTranslation]=useState(false),[flipped,setFlipped]=useState(false),[counter,setCounter]=useState(false),[voiceMessage,setVoiceMessage]=useState('');
  const country=destinations[destination];
  const original='Hello, I would like information about paracetamol 500 mg tablets.';
  function changeCountry(value:Destination){setDestination(value);setResult(false);setVoiceMessage('');}
  function speak(){
    if(!('speechSynthesis' in window)){setVoiceMessage('Audio is unavailable on this device. You can show the text instead.');return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(country.phrase);
    utterance.lang=destination==='IT'?'it-IT':destination==='FR'?'fr-FR':'es-ES';
    utterance.onerror=()=>setVoiceMessage('Audio could not play. You can show the text instead.');
    window.speechSynthesis.speak(utterance);
  }
  const maps=(term:string)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(term+' '+country.name)}`;
  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <a href="/membership" className={styles.account}><UserRound size={19}/><span>Account</span></a>
        <a href="/" aria-label="Medicea home" className={styles.logo}><img src="/logo.png" alt="medicéa"/></a>
        <span className={styles.language}>EN <ChevronDown size={12}/></span>
      </header>
      <div className={styles.previewLabel}><span className={styles.dot}/> DESIGN PREVIEW <span>01 — Your medicine passport</span></div>
      <section className={styles.hero}>
        <div className={styles.heroContent}><span className={styles.eyebrow}>A LITTLE CLOSER TO HOME</span>
          <h1>Your medicine,<br/><em>wherever</em> you land.</h1>
          <p>Find your next step. In your language.</p>
        </div>
        <span className={styles.photoCredit}>VERNAZZA · ITALY</span>
      </section>
      <div className={styles.workspace}>
        <div>
          <section className={styles.searchCard} aria-labelledby="search-title">
            <div className={styles.cardTop}><h2 id="search-title">Where are you heading?</h2><span>01 / FIND</span></div>
            <div className={styles.journey}>
              <div><span className={styles.eyebrow}>FROM</span><strong>GB</strong><span>United Kingdom</span></div>
              <ArrowLeftRight size={23} className={styles.journeyArrow}/>
              <label><span className={styles.eyebrow}>TO</span><select aria-label="Destination" value={destination} onChange={e=>changeCountry(e.target.value as Destination)}>{Object.entries(destinations).map(([code,c])=><option key={code} value={code}>{code} · {c.name}</option>)}</select><span>Your destination</span></label>
            </div>
            <form onSubmit={e=>{e.preventDefault();setResult(true);}} className={styles.searchForm}>
              <label htmlFor="example-medicine">Your medicine <span>· sample search</span></label>
              <div className={styles.searchInput}><Search size={20}/><input id="example-medicine" value="Paracetamol · 500 mg tablets" readOnly/><button type="submit">{result?'Show again':'Explore'} <ArrowRight size={17}/></button></div>
            </form>
            <p className={styles.demoNote}>Interactive sample, not a medicine recommendation. <a href="/">Open the current live search ↗</a></p>
          </section>

          {result ? <section className={styles.result} aria-labelledby="result-title" aria-live="polite">
            <div className={styles.cardTop}><span className={styles.eyebrow}>YOUR NEXT STEP IN {country.name.toUpperCase()}</span><button aria-label={saved?'Remove sample from saved':'Save sample result'} className={styles.iconButton} onClick={()=>setSaved(!saved)}>{saved?<Check size={20}/>:<Bookmark size={20}/>}</button></div>
            <h2 id="result-title">Paracetamol <span>500 mg · tablets</span></h2>
            <p className={styles.resultNote}>Example result layout. A real search will retain ingredient, strength, formulation, alternatives and sources.</p>
            <label className={styles.scenario}><input type="checkbox" checked={prescription} onChange={e=>setPrescription(e.target.checked)}/> Preview a prescription-required result</label>
            {prescription && <p className={styles.prescription}><FileText size={16}/> Prescription required · illustrative scenario</p>}
            <div className={styles.quickActions}>
              <a href={maps(country.pharmacy)} target="_blank" rel="noopener noreferrer"><MapPin size={20}/><span>Find a pharmacy</span><ArrowRight size={16}/></a>
              {prescription&&<a href={maps(country.gp)} target="_blank" rel="noopener noreferrer"><Stethoscope size={20}/><span>Find a GP</span><ArrowRight size={16}/></a>}
              <button onClick={()=>{setTranslation(true);setFlipped(false);setCounter(false);}}><ArrowLeftRight size={20}/><span>Show the pharmacist</span><ArrowRight size={16}/></button>
            </div>
            <details className={styles.details}><summary>Medicine details & sources <ChevronDown size={16}/></summary><p>This prototype uses a fixed sample. Live results will keep all existing details and safety information here. Prescription status must be confirmed for the specific product and country. Ask a pharmacist to confirm suitability.</p></details>
            {saved&&<p className={styles.savedNotice}><Check size={15}/> Sample saved for this preview session.</p>}
          </section> : <section className={styles.invitation}><span className={styles.stamp}>{destination}<small>{country.name}</small></span><div><h2>A familiar medicine.<br/>An unfamiliar place.</h2><p>Explore the sample to see pharmacy and translation actions together.</p></div></section>}
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.sectionHeading}><h2>What else do you need?</h2><span>EXPLORE</span></div>
          <a href="/?section=tools" className={styles.service}><span className={`${styles.serviceIcon} ${styles.rose}`}><HeartPulse size={23}/></span><span><strong>Health tools</strong><small>Leaflets, generics & symptom tools</small></span><ArrowRight size={18}/></a>
          <a href="/?section=care" className={styles.service}><span className={`${styles.serviceIcon} ${styles.sage}`}><MapPin size={23}/></span><span><strong>Care nearby</strong><small>Doctors, labs, imaging & more</small></span><ArrowRight size={18}/></a>
          <a href="/pets" className={styles.service}><span className={`${styles.serviceIcon} ${styles.ochre}`}><PawPrint size={23}/></span><span><strong>Meds 4 Pets</strong><small>For your travelling companions</small></span><ArrowRight size={18}/></a>
          <div className={styles.note}><span className={styles.eyebrow}>AT THE PHARMACY COUNTER</span><h3>Less explaining.<br/>More understanding.</h3><p>A clear request in {country.language}, with the original alongside it.</p><button onClick={()=>{setTranslation(true);setFlipped(false);setCounter(false);}}>Try the translation card <ArrowRight size={17}/></button></div>
        </aside>
      </div>
      <footer className={styles.footer}><Pill size={17}/><p>Medicine information is educational. Confirm suitability with a pharmacist.<br/><a href="/">Current app</a><span> · </span><a href="/terms">Terms</a><span> · </span><a href="/privacy">Privacy</a></p><span className={styles.footerNote}>A DESIGN STUDY · NO PURCHASES</span></footer>
    </div>
    <Dialog.Root open={translation} onOpenChange={open=>{setTranslation(open);if(!open&&'speechSynthesis' in window)window.speechSynthesis.cancel();}}>
      <Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={`${styles.dialog} ${counter?styles.counter:''}`}>
        <div className={styles.dialogHeader}><div><Dialog.Title>Show the pharmacist</Dialog.Title><Dialog.Description>English ↔ {country.language} · sample phrase</Dialog.Description></div><Dialog.Close className={styles.iconButton} aria-label="Close translator"><X size={23}/></Dialog.Close></div>
        <div className={`${styles.phrase} ${flipped?styles.flipped:''}`}><span className={styles.eyebrow}>FOR THE PHARMACIST · {country.language.toUpperCase()}</span><p lang={destination==='IT'?'it':destination==='FR'?'fr':'es'}>{country.phrase}</p><button onClick={speak}><Volume2 size={18}/> Read aloud</button></div>
        <div className={styles.original}><span className={styles.eyebrow}>YOUR ORIGINAL · ENGLISH</span><p>{original}</p><span className={styles.dose}>500 mg · tablets</span></div>
        <div className={styles.translatorActions}><button onClick={()=>setFlipped(!flipped)}><RotateCw size={17}/>{flipped?'Face me':'Face the pharmacist'}</button><button onClick={()=>setCounter(!counter)}><Maximize2 size={17}/>{counter?'Compact view':'Large counter view'}</button></div>
        <p className={styles.translationNote}>Sample translation. Confirm medicine names, doses and units together. Two-way microphone translation is planned; no audio is recorded or uploaded by this preview.</p>
        {voiceMessage&&<p role="status">{voiceMessage}</p>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </main>;
}
