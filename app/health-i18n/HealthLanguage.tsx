'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../LanguageProvider';
import type { LangCode } from '../i18n/i18n';
import english from './catalogs/en.json';

const languages: [LangCode, string][] = [
  ['en','English'],['af','Afrikaans'],['ar','العربية'],['cs','Čeština'],
  ['da','Dansk'],['de','Deutsch'],['el','Ελληνικά'],['es','Español'],
  ['fi','Suomi'],['fr','Français'],['he','עברית'],['hi','हिन्दी'],
  ['hu','Magyar'],['it','Italiano'],['ja','日本語'],['ko','한국어'],
  ['nl','Nederlands'],['no','Norsk'],['pl','Polski'],['pt','Português'],
  ['ro','Română'],['ru','Русский'],['sv','Svenska'],['tr','Türkçe'],['zh','中文'],
];
type Values = Record<string, string | number>;
type Translate = (text: string, values?: Values) => string;
const Context = createContext<Translate>(text => text);
const base: Record<string,string> = english;

export function translate(catalog: Record<string,string>, text: string, values: Values = {}) {
  const translated = catalog[text] ?? base[text] ?? text;
  return translated.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}

function HealthProvider({children}: {children: React.ReactNode}) {
  const {lang,setLang,dir} = useLanguage();
  const pathname=usePathname();
  const [bundle,setBundle] = useState<{lang: string; catalog: Record<string,string>}>({lang:'en',catalog:base});
  useEffect(() => {
    let active = true;
    // The cookie is a language preference only. Authentication never depends on it.
    document.cookie = `medicea_lang=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
    document.documentElement.lang = lang;
    if(lang==='en') setBundle({lang,catalog:base});
    else import(`./catalogs/${lang}.json`).then(mod => {
      if(active) setBundle({lang,catalog:mod.default});
    }).catch(() => {if(active) setBundle({lang,catalog:base});});
    return () => {active=false;};
  },[lang]);
  // Never show the previous language's bundle while switching languages.
  const catalog = bundle.lang===lang ? bundle.catalog : base;
  const tr: Translate = (text,values) => translate(catalog,text,values);
  useEffect(() => {
    const title=pathname.startsWith('/vault')?'Your private test vault.':pathname.includes('/recovery')?'Lost your authenticator?':'My account';
    document.title=tr(title)+' · medicéa';
  },[pathname,lang,bundle]);
  return <Context.Provider value={tr}><div lang={lang} dir={dir}>
    <div style={{maxWidth:560,margin:'0 auto',padding:'16px 20px 0',textAlign:'end'}}>
      <label>{tr('Language')} <select aria-label={tr('Language')} value={lang} onChange={event=>setLang(event.target.value as LangCode)} style={{font:'inherit',maxWidth:'100%',padding:8,borderRadius:8}}>
        {languages.map(([code,label])=><option key={code} value={code}>{label}</option>)}
      </select></label>
    </div>{children}
  </div></Context.Provider>;
}

export function HealthLanguage({children}: {children: React.ReactNode}) {
  return <LanguageProvider><HealthProvider>{children}</HealthProvider></LanguageProvider>;
}
export function useHealthText() {return useContext(Context);}
export function HealthText({text,values}: {text:string;values?:Values}) {
  const tr=useHealthText();
  return <>{tr(text,values)}</>;
}
export function HealthDate({value}: {value:string}) {
  const {lang}=useLanguage();
  return <time dateTime={value}>{new Date(value).toLocaleDateString(lang==='no'?'nb':lang,{timeZone:'UTC'})}</time>;
}
