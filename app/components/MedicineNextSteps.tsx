'use client';
import {useState} from 'react';
export default function MedicineNextSteps({medicine,country,dosage,onFind}: {
  medicine:string;country:string;dosage:string;onFind:(service:'pharmacy'|'gp')=>void;
}) {
  const [recipient,setRecipient]=useState('pharmacist');
  const [text,setText]=useState(`Hello, I would like to ask about ${medicine}${dosage ? ` (my entered dosage: ${dosage})` : ''}. Can you confirm the ingredients, strength and suitability, and whether a prescription is required?`);
  const [language,setLanguage]=useState('');
  const [translated,setTranslated]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function translate() {
    setBusy(true);setError('');setTranslated('');
    try {
      const response=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,target:language})});
      const body=await response.json();
      if(!response.ok || typeof body.result!=='string' || !body.result.trim()) throw new Error();
      setTranslated(body.result);
    } catch {setError('Translation is unavailable. Please retry.');}
    finally {setBusy(false);}
  }
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
      <label>Speak with<select disabled={busy} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="pharmacist">Pharmacist</option><option value="GP">GP</option></select></label>
      <label>Your message to the {recipient}<textarea disabled={busy} maxLength={2000} value={text} onChange={e=>{setText(e.target.value);setTranslated('');}} /></label>
      <label>Translate into<input disabled={busy} maxLength={80} placeholder="e.g. Italian" value={language} onChange={e=>{setLanguage(e.target.value);setTranslated('');}} /></label>
      <button type="button" className="pill pill--blue" disabled={busy||!text.trim()||!language.trim()} onClick={translate}>{busy?'Translating…':'Translate message'}</button>
      {error&&<p role="alert">{error}</p>}
      {translated&&<div className="conversation-translation"><strong>Translation · {language}</strong><p>{translated}</p><strong>Original</strong><p>{text}</p><small>AI translation: check medicine names, numbers and units with the professional. This message is not saved.</small></div>}
    </details>
    <p><strong>4. Complete your purchase with the pharmacy</strong><br/>The pharmacist must confirm suitability and any prescription before dispensing. Medicea does not sell or reserve medicines.</p>
  </section>;
}
