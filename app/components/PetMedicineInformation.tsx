'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {veterinaryInformationCopy} from '../i18n/veterinary-information';
import {officialVeterinaryLeafletSearch, type VeterinaryIngredient} from '../lib/veterinary-details';

export default function PetMedicineInformation({medicineName, country, lang, ingredients, ingredientLabel, loadingLabel, errorLabel}: {
  medicineName:string; country:string; lang:string; ingredients?:VeterinaryIngredient[];
  ingredientLabel:string; loadingLabel:string; errorLabel:string;
}) {
  const copy = veterinaryInformationCopy(lang);
  const id = useId();
  const [information, setInformation] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function toggle() {
    if (information) {setOpen(!open); return;}
    setOpen(true); setError(false); setLoading(true);
    const request = new AbortController(); controller.current = request;
    try {
      const response = await fetch('/api/openai/veterinary-information', {
        method:'POST',headers:{'Content-Type':'application/json'},signal:request.signal,
        body:JSON.stringify({drugName:medicineName,originCountry:country,lang}),
      });
      if (!response.ok) throw new Error('unavailable');
      const payload = await response.json();
      if (typeof payload.information_text !== 'string' || !payload.information_text.trim()) throw new Error('empty');
      if (!request.signal.aborted) setInformation(payload.information_text);
    } catch {if (!request.signal.aborted) setError(true);}
    finally {if (!request.signal.aborted) setLoading(false);}
  }
  return <article className="pet-information-card">
    <h3>{medicineName} — {country}</h3>
    {ingredients && ingredients.length > 0 && <div><strong>{ingredientLabel}</strong>
      <ul>{ingredients.map((item,index) => <li key={index}>{item.name}{item.strength ? ` — ${item.strength}` : ''}</li>)}</ul>
    </div>}
    <p className="search-note">{copy.notice}</p>
    <div className="pet-information-actions">
      <button type="button" disabled={loading} aria-busy={loading} aria-expanded={open} aria-controls={id} onClick={toggle}>
        {loading ? loadingLabel : open && information ? copy.hide : copy.view}
      </button>
      <a href={officialVeterinaryLeafletSearch(medicineName,country)} target="_blank" rel="noopener noreferrer">{copy.official}</a>
    </div>
    {open && <div id={id}>
      {error ? <p role="alert">{errorLabel}</p> : loading ? <p role="status">{loadingLabel}</p> : <div className="pet-information-text">{information}</div>}
    </div>}
  </article>;
}
