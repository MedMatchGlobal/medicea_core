'use client';
import {Fragment,useEffect,useState} from 'react';
import {useLanguage} from '../LanguageProvider';
import {SUPPORTED_LANGS} from './i18n';
import english from './membership/en.json';
import MediceaBrand from '../components/MediceaBrand';
export type MembershipCopy=typeof english;
export type MembershipKey=keyof MembershipCopy;
export function useMembershipCopy(){
 const {lang,dir}=useLanguage();const [copy,setCopy]=useState<MembershipCopy>(english);
 useEffect(()=>{let active=true;
  if(lang==='en'||!SUPPORTED_LANGS.includes(lang)){setCopy(english);return;}
  import(`./membership/${lang}.json`).then(module=>{if(active)setCopy({...english,...module.default});}).catch(()=>{if(active)setCopy(english);});
  return()=>{active=false;};
 },[lang]);
 return {copy,lang,dir};
}
export function membershipText(text:string,params:Record<string,string|number>={}){
 return text.replace(/<(\w+)\/>/g,(_,key)=>key==='brand'?'medicéa':key==='support'?'support@medicea.global':String(params[key]??''));
}
export function MembershipText({text,params={}}:{text:string;params?:Record<string,string|number>}){
 return <>{text.split(/(<\w+\/>)/g).map((part,index)=><Fragment key={index}>{part==='<brand/>'?<MediceaBrand/>:part==='<support/>'?<a href="mailto:support@medicea.global">support@medicea.global</a>:part.match(/^<\w+\/>$/)?String(params[part.slice(1,-2)]??''):part}</Fragment>)}</>;
}
