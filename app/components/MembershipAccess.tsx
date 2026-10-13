'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ACCESS_EVENT,RETURN_KEY,membershipReturnHref,rememberSearchReturn} from '../lib/membership-client';
import styles from './MembershipAccess.module.css';
import {useMembershipCopy} from '../i18n/membership';
const MembershipContext=createContext(false);
export const useMembershipPreview=()=>useContext(MembershipContext);
export default function MembershipAccess({enabled,children}:{enabled:boolean;children:React.ReactNode}) {
 const [reason,setReason]=useState<string|null>(null);
 const {copy,dir}=useMembershipCopy();
 const lastFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  const open=(event:Event)=>{lastFocus.current=document.activeElement as HTMLElement;setReason((event as CustomEvent).detail.reason);};
  window.addEventListener(ACCESS_EVENT,open);return()=>window.removeEventListener(ACCESS_EVENT,open);
 },[enabled]);
 const temporary=['TOO_MANY_CONCURRENT_REQUESTS','TRIAL_REQUESTS_PENDING','SEARCH_UNAVAILABLE','INVALID_ORIGIN','SEARCH_ACCESS_INVALID'].includes(reason||'');
 const title=reason==='SIGN_IN_REQUIRED'?copy.signInDialogTitle:reason==='MONTHLY_LIMIT'?copy.limitDialogTitle:reason==='SEARCH_ACCESS_INVALID'?copy.invalidDialogTitle:copy.temporaryDialogTitle;
 const text=reason==='SIGN_IN_REQUIRED'?copy.signInDialogText:reason==='MONTHLY_LIMIT'?copy.limitDialogText:reason==='SEARCH_ACCESS_INVALID'?copy.invalidDialogText:reason==='SEARCH_UNAVAILABLE'?copy.unavailableDialogText:reason==='INVALID_ORIGIN'?copy.originDialogText:copy.pendingDialogText;
 function account(){rememberSearchReturn();setReason(null);window.location.assign('/membership');}
 return <MembershipContext.Provider value={enabled}>{children}<Dialog.Root open={!!reason} onOpenChange={open=>{if(!open)setReason(null);}}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content dir={dir} className={styles.dialog} onCloseAutoFocus={event=>{event.preventDefault();lastFocus.current?.focus();}}><Dialog.Title className={styles.title}>{title}</Dialog.Title><Dialog.Description className={styles.description}>{text}</Dialog.Description><div className={styles.actions}>{!temporary&&<button className={styles.primary} onClick={account}>{copy.viewAccount}</button>}<Dialog.Close className={styles.secondary}>{temporary?copy.close:copy.notNow}</Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root></MembershipContext.Provider>;
}
export function useSearchReturn() {
 const [href,setHref]=useState<string|null>(null);
 useEffect(()=>{try{setHref(membershipReturnHref(sessionStorage.getItem(RETURN_KEY)));}catch{}},[]);
 return href;
}
