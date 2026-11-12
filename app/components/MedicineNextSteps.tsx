'use client';
import {useEffect,useRef,useState} from 'react';
import {conversationLanguages,conversationLanguageName} from '../lib/conversation-languages';

function LanguageOptions() {
  return <>{conversationLanguages.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}</>;
}

export default function MedicineNextSteps({medicine,country,dosage,onFind,lang='en'}: {
  medicine:string;country:string;dosage:string;onFind:(service:'pharmacy'|'gp')=>void;lang?:string;
}) {
  const [recipient,setRecipient]=useState('pharmacist');
  const [text,setText]=useState(`Hello, I would like to ask about ${medicine}${dosage ? ` (my entered dosage: ${dosage})` : ''}. Can you confirm the ingredients, strength and suitability, and whether a prescription is required?`);
  const [patientLanguage,setPatientLanguage]=useState(conversationLanguageName(lang)?lang:'en');
  const [language,setLanguage]=useState('');
  const [translated,setTranslated]=useState('');
  const [reply,setReply]=useState('');
  const [translatedReply,setTranslatedReply]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<'patient'|'professional'|null>(null);
  const [facing,setFacing]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{if(facing)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[facing]);
  function resetLanguages() {setTranslated('');setTranslatedReply('');setError('');}
  async function translate(side:'patient'|'professional') {
    if(busy)return;
    const message=side==='patient'?text:reply;
    const target=conversationLanguageName(side==='patient'?language:patientLanguage);
    if(!message.trim()||!target)return;
    const controller=new AbortController();request.current=controller;
    setBusy(side);setError('');
    if(side==='patient')setTranslated('');else setTranslatedReply('');
    try {
      const response=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:message,target}),signal:controller.signal});
      const body=await response.json();
      if(!response.ok || typeof body.result!=='string' || !body.result.trim()) throw new Error();
      if(side==='patient')setTranslated(body.result);else setTranslatedReply(body.result);
    } catch {if(!controller.signal.aborted)setError('Translation is unavailable. Please retry.');}
    finally {if(request.current===controller){request.current=null;setBusy(null);}}
  }
  const professional=recipient==='GP'?'GP':'pharmacist';
  const note='AI translation: check medicine names, numbers and units with the professional. This conversation is not saved.';
  return <section className="medicine-next-steps" aria-label={`Next steps for ${medicine}`}>
    <h3>Next steps · {medicine}</h3>
    <p>{country} · A candidate to discuss with a professional, not a confirmed interchangeable medicine.</p>
    <div className="medicine-next-actions">
      <button type="button" className="pill pill--blue" onClick={()=>onFind('pharmacy')}>1. Find a pharmacy</button>
      <button type="button" className="clear-search" onClick={()=>onFind('gp')}>2. Find a GP</button>
    </div>
    <p className="search-note">Check stock with the pharmacy. If a prescription is required, consult a locally authorised clinician. Prescription status has not been verified here.</p>
    <details>
      <summary>3. Prepare a conversation</summary>
      <label>Speak with<select disabled={!!busy} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="pharmacist">Pharmacist</option><option value="GP">GP</option></select></label>
      <div className="conversation-languages">
        <label>Your language<select disabled={!!busy} value={patientLanguage} onChange={e=>{setPatientLanguage(e.target.value);resetLanguages();}}><LanguageOptions /></select></label>
        <label>Translate into<select disabled={!!busy} value={language} onChange={e=>{setLanguage(e.target.value);resetLanguages();}}><option value="" disabled>Choose a language</option><LanguageOptions /></select></label>
      </div>
      <label>Your message to the {professional}<textarea dir="auto" disabled={!!busy} maxLength={2000} value={text} onChange={e=>{setText(e.target.value);setTranslated('');}} /></label>
      <div className="medicine-next-actions">
        <button type="button" className="pill pill--blue" disabled={!!busy||!text.trim()||!language} onClick={()=>translate('patient')}>{busy==='patient'?'Translating…':'Translate message'}</button>
        <button type="button" className="clear-search" disabled={!language} onClick={()=>setFacing(true)}>Open face-to-face conversation</button>
      </div>
      <p className="search-note">Face-to-face view turns the top half towards the {professional} and keeps your half facing you. Both people can type and translate replies.</p>
      {error&&!facing&&<p role="alert">{error}</p>}
      {translated&&<div className="conversation-translation" aria-live="polite"><strong>For the {professional} · {conversationLanguageName(language)}</strong><p dir="auto">{translated}</p></div>}
      <p className="search-note">{note}</p>
    </details>
    <dialog ref={dialog} className="conversation-dialog" aria-label="Face-to-face conversation" onCancel={()=>setFacing(false)} onClose={()=>setFacing(false)}>
      <div className="conversation-facing">
        <section className="conversation-half conversation-professional" aria-label={`${professional} side`}>
          <h2>{recipient==='GP'?'GP':'Pharmacist'} · {conversationLanguageName(language)}</h2>
          <div className="conversation-message" aria-live="polite" dir="auto">{translated||'The patient’s translated message will appear here.'}</div>
          <label>Your reply<textarea dir="auto" disabled={!!busy} maxLength={2000} value={reply} onChange={e=>{setReply(e.target.value);setTranslatedReply('');}} /></label>
          <button type="button" className="pill pill--blue" disabled={!!busy||!reply.trim()} onClick={()=>translate('professional')}>{busy==='professional'?'Translating…':`Translate reply into ${conversationLanguageName(patientLanguage)}`}</button>
        </section>
        <div className="conversation-divider"><span>Face-to-face conversation</span><button autoFocus type="button" className="clear-search" onClick={()=>setFacing(false)}>Close conversation</button></div>
        <section className="conversation-half conversation-patient" aria-label="Patient side">
          <h2>You · {conversationLanguageName(patientLanguage)}</h2>
          <div className="conversation-message" aria-live="polite" dir="auto">{translatedReply||`The ${professional}’s translated reply will appear here.`}</div>
          <label>Your message<textarea dir="auto" disabled={!!busy} maxLength={2000} value={text} onChange={e=>{setText(e.target.value);setTranslated('');}} /></label>
          <button type="button" className="pill pill--blue" disabled={!!busy||!text.trim()||!language} onClick={()=>translate('patient')}>{busy==='patient'?'Translating…':`Translate message into ${conversationLanguageName(language)}`}</button>
          {error&&<p role="alert">{error}</p>}
          <small>{note}</small>
        </section>
      </div>
    </dialog>
    <p><strong>4. Complete your purchase with the pharmacy</strong><br/>The pharmacist must confirm suitability and any prescription before dispensing. Medicea does not sell or reserve medicines.</p>
  </section>;
}
