'use client';

import { useEffect, useMemo, useState } from 'react';
import { SupportedLang, useLanguage } from '../LanguageProvider';

// Fixed, deterministic list (no sorting on render → avoids SSR/CSR diffs)
const OPTIONS: Array<{ code: SupportedLang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },  
  { code: 'ar', label: 'العربية' },
  { code: 'cs', label: 'Čeština' },
  { code: 'zh', label: '中文' },  
  { code: 'da', label: 'Dansk' },
  { code: 'de', label: 'Deutsch' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'he', label: 'עברית' },  
  { code: 'hi', label: 'हिन्दी' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'hu', label: 'Magyar' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'no', label: 'Norsk' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ro', label: 'Română' },
  { code: 'fi', label: 'Suomi' },
  { code: 'sv', label: 'Svenska' },  
  { code: 'tr', label: 'Türkçe' },
];

export default function LanguageButton() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: only show the real current label after mount.
  useEffect(() => setMounted(true), []);

  const currentLabel = useMemo(() => {
    const found = OPTIONS.find(o => o.code === lang);
    return found?.label ?? 'Language';
  }, [lang]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        // On the server we render a stable placeholder; client replaces it after mount.
        children={mounted ? currentLabel : 'Language'}
        style={{
          padding: '8px 12px',
          borderRadius: 12,
          border: '1px solid #ddd',
          background: '#fff',
          cursor: 'pointer',
          minWidth: 120,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      />

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          style={{
            position: 'absolute',
            zIndex: 50,
            marginTop: 8,
            padding: 6,
            border: '1px solid #eee',
            borderRadius: 12,
            background: '#fff',
            minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {OPTIONS.map(o => (
            <button
              key={o.code}
              role="option"
              aria-selected={o.code === lang}
              onClick={() => {
                setLang(o.code);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                border: 'none',
                background: o.code === lang ? '#f0f6ff' : 'transparent',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
