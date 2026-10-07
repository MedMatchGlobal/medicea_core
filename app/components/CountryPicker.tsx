'use client';

import { useId, useState } from 'react';
import countriesByRegion from '../../data/countries';

export default function CountryPicker({ label, value, onChange, searchLabel, regionLabel, emptyLabel }: {
  label: string; value: string; onChange: (value: string) => void;
  searchLabel: string; regionLabel: string; emptyLabel: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const groups = Object.entries(countriesByRegion).map(([name, countries]) => [name,
    countries.filter(country => (!region || name === region) && country.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ] as const).filter(([, countries]) => countries.length > 0);
  return <div className="country-picker" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <button type="button" className="country-trigger" aria-label={label} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); setQuery(''); setRegion(''); }}>{value || '—'}<span aria-hidden="true">⌄</span></button>
    {open && <div id={id} className="country-options">
      <input autoFocus type="search" aria-label={searchLabel} placeholder={searchLabel} value={query} onChange={event => setQuery(event.target.value)} />
      <select aria-label={regionLabel} value={region} onChange={event => setRegion(event.target.value)}><option value="">{regionLabel}</option>{Object.keys(countriesByRegion).map(name => <option key={name}>{name}</option>)}</select>
      <div className="country-list">{groups.length ? groups.map(([name, countries]) => <div key={name}><h3>{name}</h3>{countries.map(country => <button key={country} type="button" aria-pressed={value === country} onClick={() => { onChange(country); setOpen(false); }}>{country}</button>)}</div>) : <p role="status">{emptyLabel}</p>}</div>
    </div>}
  </div>;
}
