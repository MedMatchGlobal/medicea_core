'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import countriesByRegion from '../../data/countries';

const allCountries = Object.values(countriesByRegion).flat();

export default function CountryPicker({ label, value, onChange, searchLabel, regionLabel, emptyLabel, rememberHome = false }: {
  label: string; value: string; onChange: (value: string) => void;
  searchLabel: string; regionLabel: string; emptyLabel: string; rememberHome?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [preferred, setPreferred] = useState('');
  const [position, setPosition] = useState<CSSProperties>();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!rememberHome) return;
    let saved = '';
    try { saved = localStorage.getItem('medicea-home-country') || ''; } catch {}
    if (allCountries.includes(saved)) { setPreferred(saved); return; }
    // A locale region is only a suggestion; never choose the user's home for them.
    for (const language of navigator.languages || [navigator.language]) {
      try {
        const code = new Intl.Locale(language).region;
        if (!code) continue;
        const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
        if (name && allCountries.includes(name)) { setPreferred(name); break; }
      } catch {}
    }
  }, [rememberHome]);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const place = () => {
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds) return;
      const top = (viewport?.offsetTop || 0) + 12;
      const height = viewport?.height || window.innerHeight;
      const maxHeight = Math.min(400, height - 24);
      const width = Math.min(bounds.width, (viewport?.width || window.innerWidth) - 24);
      setPosition({ position: 'fixed', top: Math.max(top, Math.min(bounds.bottom + 6, top + height - 24 - maxHeight)),
        left: Math.max(12, Math.min(bounds.left, (viewport?.width || window.innerWidth) - width - 12)),
        width, maxHeight });
    };
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    place();
    viewport?.addEventListener('resize', place);
    viewport?.addEventListener('scroll', place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', dismiss);
    return () => {
      viewport?.removeEventListener('resize', place);
      viewport?.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [open]);
  const pinned = (value || preferred);
  const showPinned = rememberHome && allCountries.includes(pinned) && !region && pinned.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  function choose(country: string) {
    onChange(country);
    if (rememberHome) {
      setPreferred(country);
      try { localStorage.setItem('medicea-home-country', country); } catch {}
    }
    setOpen(false);
    trigger.current?.focus();
  }
  const groups = Object.entries(countriesByRegion).map(([name, countries]) => [name,
    countries.filter(country => (!region || name === region) && country.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ] as const).filter(([, countries]) => countries.length > 0);
  return <div ref={root} className="country-picker" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className="country-trigger" aria-label={label} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); setQuery(''); setRegion(''); }}>{value || '—'}<span aria-hidden="true">⌄</span></button>
    {open && <div id={id} className="country-options" style={position}>
      <input type="search" aria-label={searchLabel} placeholder={searchLabel} value={query} onChange={event => setQuery(event.target.value)} />
      <select aria-label={regionLabel} value={region} onChange={event => setRegion(event.target.value)}><option value="">{regionLabel}</option>{Object.keys(countriesByRegion).map(name => <option key={name}>{name}</option>)}</select>
      <div className="country-list">{showPinned && <button className="country-preferred" type="button" aria-pressed={value === pinned} onClick={() => choose(pinned)}>{pinned}</button>}{groups.length ? groups.map(([name, countries]) => <div key={name}><h3>{name}</h3>{countries.filter(country => !showPinned || country !== pinned).map(country => <button key={country} type="button" aria-pressed={value === country} onClick={() => choose(country)}>{country}</button>)}</div>) : <p role="status">{emptyLabel}</p>}</div>
    </div>}
  </div>;
}
