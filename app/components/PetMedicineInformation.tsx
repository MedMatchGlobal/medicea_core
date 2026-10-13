'use client';
import {useEffect, useId, useRef, useState} from 'react';
import VeterinaryLeafletSections from './VeterinaryLeafletSections';
import type {VeterinarySection} from '../lib/veterinary-sections';
import {leafletActions} from '../i18n/leaflet-actions';
import {veterinaryInformationCopy} from '../i18n/veterinary-information';
import {officialVeterinaryLeafletSearch, type VeterinaryIngredient} from '../lib/veterinary-details';
import {membershipFetch,MembershipAccessError} from '../lib/membership-client';

export default function PetMedicineInformation({medicineName, country, lang, ingredients, ingredientLabel, loadingLabel, errorLabel, headings = {}, initiallyExpanded = false, initialInformation, onInformation,searchAccess}: {
  medicineName:string; country:string; lang:string; ingredients?:VeterinaryIngredient[];
  ingredientLabel:string; loadingLabel:string; errorLabel:string;
  headings?:Record<string,string>; initiallyExpanded?:boolean; initialInformation?:VeterinarySection[]; onInformation?:(sections:VeterinarySection[])=>void;
  searchAccess?:string;
}) {
  const copy = {...veterinaryInformationCopy(lang), ...leafletActions(lang)};
  const id = useId();
  const [information, setInformation] = useState<VeterinarySection[] | null>(initialInformation || null);
  const [open, setOpen] = useState(initiallyExpanded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (initiallyExpanded && !initialInformation) void toggle();
    return () => controller.current?.abort();
  }, [initiallyExpanded]);
  async function toggle() {
    if (information) {setOpen(!open); return;}
    setOpen(true); setError(false); setLoading(true);
    const request = new AbortController(); controller.current = request;
    try {
      const response = await membershipFetch('/api/openai/veterinary-information', {
        method:'POST',headers:{'Content-Type':'application/json'},signal:request.signal,
        body:JSON.stringify({drugName:medicineName,originCountry:country,lang,searchAccess}),
      });
      if (!response.ok) throw new Error('unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.sections) || !payload.sections.length) throw new Error('empty');
      if (!request.signal.aborted) {setInformation(payload.sections);onInformation?.(payload.sections);}
    } catch (error) {if (!request.signal.aborted) {if(error instanceof MembershipAccessError)setOpen(false);else setError(true);}}
    finally {if (!request.signal.aborted) setLoading(false);}
  }
  return <article className={`medicine-result-card pet-information-card${initiallyExpanded ? " medicine-origin-card" : ""}`}>
    <div className="medicine-result-header">
      {!initiallyExpanded && <h3>{medicineName}</h3>}
      <div className="leaflet-actions pet-information-actions">
        <button className="pill pill--blue pill-sm" type="button" disabled={loading} aria-busy={loading} aria-expanded={open} aria-controls={id} onClick={toggle}>
          {loading ? loadingLabel : open && information ? copy.hide : copy.view}
        </button>
        <a className="official-leaflet-link" href={officialVeterinaryLeafletSearch(medicineName,country)} target="_blank" rel="noopener noreferrer">{copy.official}</a>
      </div>
    </div>
    {!information && ingredients && ingredients.length > 0 && <div><strong>{ingredientLabel}</strong>
      <ul>{ingredients.map((item,index) => <li key={index}>{item.name}{item.strength ? ` — ${item.strength}` : ''}</li>)}</ul>
    </div>}
    {open && <div id={id}>
      <p className="search-note">{copy.notice}</p>
      {error ? <p role="alert">{errorLabel}</p> : loading ? <p role="status">{loadingLabel}</p> : <div className="medicine-leaflet-content">{information && <VeterinaryLeafletSections sections={information} lang={lang} headings={headings} />}</div>}
    </div>}
  </article>;
}
