'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useId,useRef,useState} from 'react';
import {Menu,X} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {travelCopy} from '../i18n/travel-demo';
import {loadStrings} from '../i18n/i18n';
import en from '../i18n/en.json';
export default function TravelNav({active='search',onSection}:{active?:string;onSection?:(section:'search'|'tools'|'care')=>void}){
 const {lang}=useLanguage(),c=travelCopy(lang),[open,setOpen]=useState(false),root=useRef<HTMLElement>(null),button=useRef<HTMLButtonElement>(null),hoverDismissed=useRef(false),id=useId();
 const pathname=usePathname(),router=useRouter();
 // Account is often the first stop before opening a tool not yet visited.
 useEffect(()=>{if(active==='account')for(const href of ['/','/?section=tools','/?section=care','/pets'])router.prefetch(href);},[active,router]);
 const [labels,setLabels]=useState<Pick<typeof en.ui,'medicineTools'|'findCare'|'btnPets'>>(en.ui);
 useEffect(()=>{let current=true;loadStrings(lang).then(copy=>{if(current)setLabels(copy.ui);});return()=>{current=false;};},[lang]);
 const items=[{id:'search',href:'/',label:c.search},{id:'tools',href:'/?section=tools',label:labels.medicineTools||en.ui.medicineTools},{id:'care',href:'/?section=care',label:labels.findCare||en.ui.findCare},{id:'pets',href:'/pets',label:labels.btnPets||en.ui.btnPets},...(['trips','updates','account'] as const).map(tab=>({id:tab,href:`/travel?tab=${tab}`,label:c[tab]}))];
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){hoverDismissed.current=true;setOpen(false);button.current?.focus();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[open]);
 return <nav ref={root} className="travel-nav" aria-label={c.tripPack} onPointerEnter={e=>{if(e.pointerType==='mouse'&&!hoverDismissed.current)setOpen(true);}} onPointerLeave={e=>{hoverDismissed.current=false;if(e.pointerType==='mouse'&&!root.current?.contains(document.activeElement))setOpen(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
 <button ref={button} className="travel-menu-button" aria-label={c.tripPack} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{open?<X size={23} aria-hidden="true"/>:<Menu size={23} aria-hidden="true"/>}</button>
 <div id={id} className="travel-menu-links" dir={['ar','he'].includes(lang)?'rtl':'ltr'} hidden={!open}>{items.map(item=><Link key={item.id} href={item.href} prefetch={!(pathname==='/travel'&&item.href.startsWith('/travel?'))} aria-current={active===item.id?'page':undefined} onClick={event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(onSection&&['search','tools','care'].includes(item.id)){event.preventDefault();onSection(item.id as 'search'|'tools'|'care');}
  else if(pathname==='/travel'&&item.href.startsWith('/travel?')){
   event.preventDefault();
   // These views share the same mounted client workspace and saved-trip state.
   if(window.location.pathname+window.location.search!==item.href)window.history.pushState(null,'',item.href);
   window.scrollTo({top:0,behavior:'instant'});
  }
  setOpen(false);
 }}>{item.label}</Link>)}</div></nav>;
}
