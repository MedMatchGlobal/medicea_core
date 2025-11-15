'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { LangCode } from './i18n/i18n'; // ← was ./i18n/manifest (fix)
import { isRTL, loadStrings } from './i18n/i18n';

export type SupportedLang = LangCode;

type Ctx = {
  lang: SupportedLang;
  setLang: (l: SupportedLang) => void;
  t: any;                // resolved bundle (NOT a Promise)
  dir: 'ltr' | 'rtl';
};

const LanguageCtx = createContext<Ctx | null>(null);

const LS_KEY = 'medicea.lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>('en');
  const [t, setT] = useState<any>({});         // will hold the resolved strings
  const [mounted, setMounted] = useState(false);

  // Hydrate lang once from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as SupportedLang | null;
      if (saved) setLangState(saved);
    } catch {}
    setMounted(true);
  }, []);

  // Resolve strings whenever lang changes (✅ await the async loader)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const strings = await loadStrings(lang);
        if (!cancelled) setT(strings);
      } catch {
        if (!cancelled) setT({});
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  const setLang = (l: SupportedLang) => {
    setLangState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
  };

  const dir: 'ltr' | 'rtl' = useMemo(() => (isRTL(lang) ? 'rtl' : 'ltr'), [lang]);

  // Before hydration finishes, present EN + LTR to avoid mismatch flashes
  const effective = mounted
    ? { lang, t, dir }
    : { lang: 'en' as SupportedLang, t: {}, dir: 'ltr' as const };

  return (
    <LanguageCtx.Provider value={{ ...effective, setLang }}>
      <div dir={effective.dir}>{children}</div>
    </LanguageCtx.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
  return ctx;
}
