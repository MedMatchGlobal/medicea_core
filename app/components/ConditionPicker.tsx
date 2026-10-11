'use client';

import { useId, useRef, useState } from 'react';

/** Editable condition field: suggestions are optional, never a closed catalog. */
export default function ConditionPicker({label, value, onChange, groups, hint}: {
  label: string; value: string; onChange: (value: string) => void;
  groups: Array<{label: string; items: string[]}>; hint: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const query = value.trim().toLocaleLowerCase();
  const filtered = groups.map(group => ({...group,
    items: group.items.filter(item => item.toLocaleLowerCase().includes(query))
  })).filter(group => group.items.length);
  return <div ref={root} className="condition-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="condition-field">
      <input id={id} type="text" maxLength={160} aria-label={label} aria-describedby={`${id}-hint`}
        value={value} onChange={event => {onChange(event.target.value); setOpen(true);}}
        onFocus={() => setOpen(true)} onKeyDown={event => {if (event.key === 'Escape') setOpen(false);}} />
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={`${id}-options`}
        onClick={() => setOpen(!open)}>⌄</button>
    </div>
    <p id={`${id}-hint`} className="field-hint">{hint}</p>
    {open && filtered.length > 0 && <div id={`${id}-options`} className="condition-options">
      {filtered.map(group => <div key={group.label}>{group.label && <h3>{group.label}</h3>}
        {group.items.map(item => <button type="button" key={item} onClick={() => {
          onChange(item); setOpen(false);
        }}>{item}</button>)}
      </div>)}
    </div>}
  </div>;
}
