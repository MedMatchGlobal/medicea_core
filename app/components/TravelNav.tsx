'use client';
import Link from 'next/link';
import {useLanguage} from '../LanguageProvider';
import {travelCopy} from '../i18n/travel-demo';
export default function TravelNav({active='search'}:{active?:string}){
 const {lang}=useLanguage(),c=travelCopy(lang);
 return <nav className="travel-nav" aria-label={c.tripPack}>{(['search','trips','updates','account'] as const).map(tab=><Link key={tab} href={tab==='search'?'/':`/travel?tab=${tab}`} aria-current={active===tab?'page':undefined}>{c[tab]}</Link>)}</nav>;
}
