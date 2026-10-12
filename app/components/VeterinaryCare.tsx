'use client';

import {useId, useState} from 'react';
import {veterinaryCareCopy} from '../i18n/veterinary-care';
import {veterinaryCareUrl} from '../lib/veterinary-care';

export default function VeterinaryCare({lang, locationLabel, placeholder, openLabel, notice}: {
  lang: string; locationLabel: string; placeholder: string; openLabel: string; notice: string;
}) {
  const [location, setLocation] = useState('');
  const id = useId();
  const copy = veterinaryCareCopy(lang);
  return <section className="veterinary-care" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{copy.title}</h2>
    <p>{copy.description}</p>
    <label htmlFor={id}>{locationLabel}</label>
    <input id={id} type="text" maxLength={250} autoComplete="street-address"
      placeholder={placeholder} value={location} onChange={event => setLocation(event.target.value)} />
    {location.trim() ? <a className="veterinary-care-link" href={veterinaryCareUrl(location)}
      target="_blank" rel="noopener noreferrer">{openLabel}</a>
      : <button className="veterinary-care-link" disabled>{openLabel}</button>}
    <p className="search-note">{notice}</p>
  </section>;
}
