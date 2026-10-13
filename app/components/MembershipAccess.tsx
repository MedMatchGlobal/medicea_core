'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ACCESS_EVENT,RETURN_KEY,membershipReturnHref,rememberSearchReturn} from '../lib/membership-client';
import styles from './MembershipAccess.module.css';
const MembershipContext=createContext(false);
export const useMembershipPreview=()=>useContext(MembershipContext);
export default function MembershipAccess({enabled,children}:{enabled:boolean;children:React.ReactNode}) {
 const [reason,setReason]=useState<string|null>(null);
 const lastFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  const open=(event:Event)=>{lastFocus.current=document.activeElement as HTMLElement;setReason((event as CustomEvent).detail.reason);};
  window.addEventListener(ACCESS_EVENT,open);return()=>window.removeEventListener(ACCESS_EVENT,open);
 },[enabled]);
 const temporary=['TOO_MANY_CONCURRENT_REQUESTS','TRIAL_REQUESTS_PENDING','SEARCH_UNAVAILABLE','INVALID_ORIGIN','SEARCH_ACCESS_INVALID'].includes(reason||'');
 const title=reason==='SIGN_IN_REQUIRED'?'Sign in to continue':reason==='MONTHLY_LIMIT'?'Your free searches are used up':reason==='SEARCH_ACCESS_INVALID'?'This search access could not be verified':'Please try again shortly';
 const text=reason==='SIGN_IN_REQUIRED'?'Sign in to use your welcome trial, free searches, or paid access. Your search will be waiting when you return.':
  reason==='MONTHLY_LIMIT'?'Your welcome trial is no longer available and your free allowance for this month has been used. Choose a travel pass or subscription to make a new search, or wait for your next monthly allowance. You can still browse and reopen saved results.':
  reason==='SEARCH_ACCESS_INVALID'?'Return to the original result and try again. Sign in with the account that made the search to open its included medicine information.':
  reason==='SEARCH_UNAVAILABLE'?'We could not check your access right now. Please try again shortly.':
  reason==='INVALID_ORIGIN'?'We could not validate this request. Return to medicine search and try again.':
  'Some searches are still in progress. Wait for them to finish, then try again.';
 function account(){rememberSearchReturn();setReason(null);window.location.assign('/membership');}
 return <MembershipContext.Provider value={enabled}>{children}<Dialog.Root open={!!reason} onOpenChange={open=>{if(!open)setReason(null);}}><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.dialog} onCloseAutoFocus={event=>{event.preventDefault();lastFocus.current?.focus();}}><Dialog.Title className={styles.title}>{title}</Dialog.Title><Dialog.Description className={styles.description}>{text}</Dialog.Description><div className={styles.actions}>{!temporary&&<button className={styles.primary} onClick={account}>View account &amp; plans</button>}<Dialog.Close className={styles.secondary}>{temporary?'Close':'Not now'}</Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root></MembershipContext.Provider>;
}
export function useSearchReturn() {
 const [href,setHref]=useState<string|null>(null);
 useEffect(()=>{try{setHref(membershipReturnHref(sessionStorage.getItem(RETURN_KEY)));}catch{}},[]);
 return href;
}
