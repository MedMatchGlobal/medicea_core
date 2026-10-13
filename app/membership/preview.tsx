"use client";
import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {PERSONAL_PLANS,type PersonalPlan} from '@/lib/membership/config';
import styles from './membership.module.css';
import {useSearchReturn} from '../components/MembershipAccess';
import MembershipFooter from '../components/MembershipFooter';
import MediceaBrand from '../components/MediceaBrand';
import LanguageButton from '../components/LanguageButton';
import {useMembershipCopy,MembershipText,membershipText,type MembershipKey} from '../i18n/membership';
export default function MembershipPreview(){
 const {copy,lang,dir}=useMembershipCopy();
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[status,setStatus]=useState<any>(null),[message,setMessage]=useState<MembershipKey|null>(null),[busy,setBusy]=useState(false),[native,setNative]=useState(true);
 const returnHref=useSearchReturn();
 const accessOptions=useRef<HTMLHeadingElement>(null),refreshVersion=useRef(0);
 async function refresh(){const version=++refreshVersion.current;const response=await fetch('/api/membership/status',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error('ACCOUNT_UNAVAILABLE');if(version===refreshVersion.current)setStatus(data);return data;}
 useEffect(()=>{
  setNative(Capacitor.isNativePlatform());
  let active=true,attempts=0,timer:ReturnType<typeof setTimeout>|undefined;
  const returned=new URLSearchParams(window.location.search).get('checkout')==='returned';
  const update=async()=>{if(!active)return;try{const data=await refresh();if(active&&returned&&!data.premium&&attempts++<5)timer=setTimeout(update,2000);}catch{if(active)setMessage('accountError');}};
  const onReturn=()=>{if(timer)clearTimeout(timer);void update();};
  void update();window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);
  return()=>{active=false;refreshVersion.current++;if(timer)clearTimeout(timer);window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);};
 },[]);
 useEffect(()=>{document.title=copy.account+' · medicéa';},[copy.account]);
 async function run(path:string,body:any){setBusy(true);setMessage(null);try{
  const response=await fetch('/api/membership/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();
  if(!response.ok)throw Error(data.error||'UNAVAILABLE');if(data.url){window.location.assign(data.url);return;}
  setMessage(body.action==='send'?'checkEmail':'done');await refresh();
 }catch(error){const reason=error instanceof Error?error.message:'';
  setMessage(reason==='ACCOUNT_UNAVAILABLE'?'accountError':reason==='SIGN_IN_REQUIRED'?'errorSignIn':reason==='INVALID_CODE'?'errorCode':reason==='CODE_REQUEST_UNAVAILABLE'?'errorSend':reason==='ALREADY_SUBSCRIBED'?'errorPaid':path==='checkout'?'errorCheckout':path==='portal'?'errorPortal':path==='auth'?'errorAuth':'errorGeneric');
 }finally{setBusy(false);}}
 const checkout=(plan:PersonalPlan)=>run('checkout',{plan});
 const locale=lang==='en'?'en-GB':lang;
 const price=(plan:PersonalPlan)=>new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'}).format(PERSONAL_PLANS[plan].amountMinor/100);
 const number=(value:number)=>new Intl.NumberFormat(locale).format(value);
 const date=(value:string,time=false)=>time?new Date(value).toLocaleString(locale):new Date(value).toLocaleDateString(locale);
 const signedIn=!!status?.signedIn;
 const upgrade=()=>{accessOptions.current?.scrollIntoView({block:'start'});accessOptions.current?.focus({preventScroll:true});};
 const planCard=(plan:PersonalPlan,title:string,unit:string,description:string)=><article className={`${styles.plan} ${plan==='annual'?styles.featured:''}`} key={plan}>
  <h3>{title}</h3><p className={styles.price}><bdi>{price(plan)}</bdi> <span>{unit}</span></p><p className={styles.planDescription}>{description}</p>
  <button className={styles.primary} aria-label={status?.premium?copy.paidActive:membershipText(copy.choosePlan,{plan:title})} disabled={busy||!signedIn||status?.premium} onClick={()=>checkout(plan)}>{status?.premium?copy.active:plan.startsWith('pass')?copy.choosePass:plan==='annual'?copy.chooseAnnual:copy.chooseMonthly}</button>
 </article>;
 return <main className={styles.page} dir={dir}>
 <header className={styles.header}><a href="/" aria-label={copy.backHome}><img src="/logo.png" alt="medicéa" width="180" height="60"/></a><div className={styles.headerActions}><a className={styles.back} href="/">{dir==='rtl'?'→':'←'} {copy.backHome}</a><LanguageButton/></div></header>
 <div className={styles.previewNotice}>{copy.previewNotice}</div>
 <section className={styles.account} aria-labelledby="account-heading"><div><p className={styles.eyebrow}>{copy.yourAccount}</p><h2 id="account-heading">{signedIn?(status.premium?copy.paidActive:copy.personalAccess):copy.signInHeading}</h2>
 {signedIn?<><p className={styles.email}><bdi>{status.email}</bdi></p>{!status.premium&&<p><MembershipText text={copy.freeUsage} params={{count:number(status.used),limit:number(status.limit),date:date(status.resetsAt)}}/></p>}
 {!status.premium&&status.trialAvailable&&status.trialUsed<status.trialLimit&&<p><MembershipText text={copy.trialRemaining} params={{count:number(status.trialLimit-status.trialUsed)}}/> {status.trialEndsAt?membershipText(copy.trialEnds,{date:date(status.trialEndsAt,true)}):copy.trialNotStarted}</p>}
 {status.reserved>0&&<p><MembershipText text={copy.inProgress} params={{count:number(status.reserved)}}/></p>}</>:<p>{copy.signInIntro}</p>}</div>
 {signedIn?<div className={styles.actions}>{!native&&(status.premium?<button className={styles.primary} disabled={busy} onClick={()=>run('portal',{})}>{copy.manage}</button>:<button className={styles.primary} disabled={busy} onClick={upgrade}>{copy.upgrade}</button>)}{returnHref&&<a className={styles.continueLink} href={returnHref}>{copy.continueSearch} {dir==='rtl'?'←':'→'}</a>}<button className={styles.secondary} disabled={busy} onClick={()=>run('auth',{action:'signout'})}>{copy.signOut}</button></div>:status===null?<p role="status">{message?copy.accountUnavailable:copy.loadingAccount}</p>:<div className={styles.auth}><form onSubmit={e=>{e.preventDefault();run('auth',{action:'send',email});}}><label>{copy.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder={copy.emailPlaceholder}/></label><button className={styles.primary} disabled={busy||!email}>{copy.emailCode}</button></form><form onSubmit={e=>{e.preventDefault();run('auth',{action:'verify',email,code});}}><label>{copy.code}<input required value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder={copy.codePlaceholder}/></label><button className={styles.secondary} disabled={busy||!email||!code}>{copy.verify}</button></form></div>}
 </section>
 <div className={styles.feedback}><p role="status" aria-live="polite">{busy?copy.working:message?copy[message]:''}</p>{status===null&&message&&<button className={styles.secondary} disabled={busy} onClick={()=>refresh().then(()=>setMessage(null)).catch(()=>setMessage('accountError'))}>{copy.tryAgain}</button>}</div>
 <section className={`${styles.hero} ${status?.premium?styles.heroPaid:''}`}><div><p className={styles.productName}><bdi dir="ltr"><MediceaBrand/><strong>GO</strong></bdi> <small>{copy.personal}</small></p><h1><MembershipText text={copy.headline}/></h1><p className={styles.intro}>{copy.intro}</p></div>
 {!status?.premium&&<aside className={styles.welcome}><h2>{copy.welcomeHeading}</h2><p>{copy.welcomeSummary}</p><p className={styles.small}>{copy.welcomeSeparate}</p><details><summary>{copy.welcomeDetailsHeading}</summary><p className={styles.small}>{copy.welcomeDetails}</p></details></aside>}</section>
 {!native&&<section className={styles.options} aria-labelledby="personal-access"><h2 id="personal-access" ref={accessOptions} tabIndex={-1}>{copy.travelHeading}</h2><p className={styles.sectionIntro}>{copy.travelIntro}</p>
 <div className={styles.travelPlans}>{planCard('pass7',copy.pass7,copy.duration7,copy.ends7)}{planCard('pass14',copy.pass14,copy.duration14,copy.ends14)}{planCard('pass30',copy.pass30,copy.duration30,copy.ends30)}</div>
 <div className={styles.regularHeading}><h2>{copy.regularHeading}</h2><p className={styles.sectionIntro}>{copy.regularIntro}</p></div>
 <div className={styles.regularPlans}>{planCard('monthly',copy.monthly,copy.perMonth,copy.monthlyRenewal)}{planCard('annual',copy.annual,copy.perYear,copy.annualRenewal)}</div>
 <p className={styles.terms}>{copy.cancellation}</p>
 {!signedIn&&<p className={styles.signInHint}>{copy.signInToChoose}</p>}{status?.premium&&<p className={styles.signInHint}>{copy.alreadyPaid}</p>}
 </section>}
 {native&&<p className={styles.previewNotice}>{copy.nativeUnavailable}</p>}
 <footer className={styles.footer}><p>{copy.personalOnly}</p><p>{copy.education}</p><MembershipFooter/></footer>
 </main>;
}
