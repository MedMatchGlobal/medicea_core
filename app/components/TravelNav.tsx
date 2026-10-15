'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {Menu,X} from 'lucide-react';
import {useLanguage} from '../LanguageProvider';
import {travelCopy} from '../i18n/travel-demo';
export default function TravelNav({active='search'}:{active?:string}){
 const {lang}=useLanguage(),c=travelCopy(lang),[open,setOpen]=useState(false),root=useRef<HTMLElement>(null),button=useRef<HTMLButtonElement>(null),hoverDismissed=useRef(false),id=useId();
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){hoverDismissed.current=true;setOpen(false);button.current?.focus();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[open]);
 return <nav ref={root} className="travel-nav" aria-label={c.tripPack} onPointerEnter={e=>{if(e.pointerType==='mouse'&&!hoverDismissed.current)setOpen(true);}} onPointerLeave={e=>{hoverDismissed.current=false;if(e.pointerType==='mouse'&&!root.current?.contains(document.activeElement))setOpen(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
 <button ref={button} className="travel-menu-button" aria-label={c.tripPack} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{open?<X size={23} aria-hidden="true"/>:<Menu size={23} aria-hidden="true"/>}</button>
 <div id={id} className="travel-menu-links" hidden={!open}>{(['search','trips','updates','account'] as const).map(tab=><Link key={tab} href={tab==='search'?'/':`/travel?tab=${tab}`} aria-current={active===tab?'page':undefined} onClick={()=>setOpen(false)}>{c[tab]}</Link>)}</div></nav>;
}
