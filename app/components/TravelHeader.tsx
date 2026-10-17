'use client';
import Link from 'next/link';
import {useLanguage} from '../LanguageProvider';
import {SUPPORTED_LANGS,type LangCode} from '../i18n/i18n';
import {travelCopy} from '../i18n/travel-demo';
import TravelNav from './TravelNav';
export default function TravelHeader({active,onSection}:{active:string;onSection?:(section:'search'|'tools'|'care')=>void}){
 const {lang,setLang}=useLanguage(),c=travelCopy(lang);
 return <header className="site-header travel-header travel-shared-header">
  <Link className="travel-header-logo" href="/" aria-label="medicéa"><img src="/logo.png" alt="medicéa"/></Link>
  <TravelNav active={active} onSection={onSection}/>
  <select className="travel-header-language" aria-label={c.language} value={lang} onChange={e=>setLang(e.target.value as LangCode)}>{SUPPORTED_LANGS.map(code=><option key={code} value={code}>{new Intl.DisplayNames([code],{type:'language'}).of(code)||code}</option>)}</select>
 </header>;
}
