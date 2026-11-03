"use client";
import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {PERSONAL_PLANS,type PersonalPlan} from '@/lib/membership/config';
import styles from './membership.module.css';
import {useSearchReturn} from '../components/MembershipAccess';
import MembershipFooter from '../components/MembershipFooter';
import MediceaBrand from '../components/MediceaBrand';
import PlayOptions from './play-options';
import LanguageButton from '../components/LanguageButton';
import {useMembershipCopy,MembershipText,membershipText,type MembershipKey} from '../i18n/membership';
export default function MembershipPreview(){
 const {copy,lang,dir}=useMembershipCopy();
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[status,setStatus]=useState<any>(null),[message,setMessage]=useState<MembershipKey|null>(null),[busy,setBusy]=useState(false),[native,setNative]=useState(true);
 const [android,setAndroid]=useState(false);
 const [codeSent,setCodeSent]=useState(false);
 const [authFeedback,setAuthFeedback]=useState<MembershipKey|null>(null),[authError,setAuthError]=useState(false);
 const codeInput=useRef<HTMLInputElement>(null);
 const returnHref=useSearchReturn();
 const accessOptions=useRef<HTMLHeadingElement>(null),refreshVersion=useRef(0);
 async function refresh(){const version=++refreshVersion.current;const response=await fetch('/api/membership/status',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error('ACCOUNT_UNAVAILABLE');if(version===refreshVersion.current)setStatus(data);return data;}
 useEffect(()=>{
  setNative(Capacitor.isNativePlatform());setAndroid(Capacitor.getPlatform()==='android');
  let active=true,attempts=0,timer:ReturnType<typeof setTimeout>|undefined;
  const returned=new URLSearchParams(window.location.search).get('checkout')==='returned';
  const update=async()=>{if(!active)return;try{const data=await refresh();if(active&&returned&&!data.premium&&attempts++<5)timer=setTimeout(update,2000);}catch{if(active)setMessage('accountError');}};
  const onReturn=()=>{if(timer)clearTimeout(timer);void update();};
  void update();window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);
  return()=>{active=false;refreshVersion.current++;if(timer)clearTimeout(timer);window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);};
 },[]);
 useEffect(()=>{document.title=copy.account+' · medicéa';},[copy.account]);
 async function run(path:string,body:any){setBusy(true);setMessage(null);if(path==='auth'){setAuthFeedback(null);setAuthError(false);}
 if(path==='auth'&&body.action==='verify'){body={...body,code:body.code.trim()};if(!/^\d{6,8}$/.test(body.code)){setAuthFeedback('errorCode');setAuthError(true);setBusy(false);codeInput.current?.focus();return;}}
 try{
  const response=await fetch('/api/membership/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();
  if(!response.ok)throw Error(data.error||'UNAVAILABLE');if(data.url){window.location.assign(data.url);return;}
  if(body.action==='send'){setCodeSent(true);requestAnimationFrame(()=>codeInput.current?.focus());}
  if(body.action==='signout'){setCodeSent(false);setCode('');}
  if(path==='auth'){setAuthFeedback(body.action==='send'?'checkEmail':null);}else setMessage('done');await refresh();
 }catch(error){const reason=error instanceof Error?error.message:'';
  const feedback=reason==='ACCOUNT_UNAVAILABLE'?'accountError':reason==='SIGN_IN_REQUIRED'?'errorSignIn':reason==='INVALID_CODE'?'errorCode':reason==='CODE_REQUEST_UNAVAILABLE'?'errorSend':reason==='ALREADY_SUBSCRIBED'?'errorPaid':path==='checkout'?'errorCheckout':path==='portal'?'errorPortal':path==='auth'?'errorAuth':'errorGeneric';
  if(path==='auth'){setAuthFeedback(feedback);setAuthError(true);if(body.action==='verify')requestAnimationFrame(()=>codeInput.current?.focus());}else setMessage(feedback);
 }finally{setBusy(false);}}
 const checkout=(plan:PersonalPlan)=>run('checkout',{plan});
 const locale=lang==='en'?'en-GB':lang;
 const price=(plan:PersonalPlan)=>new Intl.NumberFormat(locale,{style:'currency',currency:'GBP'}).format(PERSONAL_PLANS[plan].amountMinor/100);
 const number=(value:number)=>new Intl.NumberFormat(locale).format(value);
 const date=(value:string,time=false)=>time?new Date(value).toLocaleString(locale):new Date(value).toLocaleDateString(locale);
 const signedIn=!!status?.signedIn;
 const upgrade=()=>{accessOptions.current?.scrollIntoView({block:'start'});accessOptions.current?.focus({preventScroll:true});};
 const planCard=(plan:PersonalPlan,title:string,unit:string,description:string)=>{const active=!!status?.premium&&status.activePlans?.includes(plan);const activeLabel=plan.startsWith('pass')?copy.activePass:copy.activeSubscription;return <article className={`${styles.plan} ${active?styles.activePlan:''}`} key={plan}>
  <h3>{title}</h3><p className={styles.price}><bdi>{price(plan)}</bdi> <span>{plan.startsWith('pass')?null:unit}</span></p><p className={styles.planDescription}>{plan.startsWith('pass')?null:description}</p>
  <button className={active?styles.activeButton:styles.primary} aria-label={active?activeLabel:membershipText(copy.choosePlan,{plan:title})} disabled={busy||!signedIn||status?.premium} onClick={()=>checkout(plan)}>{active?activeLabel:plan.startsWith('pass')?copy.choosePass:plan==='annual'?copy.chooseAnnual:copy.chooseMonthly}</button>
 </article>;};
 return <main className={styles.page} dir={dir}>
 <header className={styles.header}><a href="/" aria-label={copy.backHome}><img src="/logo.png" alt="medicéa" width="180" height="60"/></a><div className={styles.headerActions}><a className={styles.back} href="/">{dir==='rtl'?'→':'←'} {copy.backHome}</a><LanguageButton/></div></header>
 <div className={styles.previewNotice}>{copy.previewNotice}</div>

 <section className={`${styles.hero} ${status?.premium?styles.heroPaid:''}`}><div><p className={styles.productName}><bdi dir="ltr"><MediceaBrand/><strong>GO</strong></bdi> <small>{copy.personal}</small></p><h1><MembershipText text={copy.headline}/></h1><p className={styles.intro}>{copy.intro}</p></div>
 </section>
 {status&&!status.premium&&<aside className={styles.welcome}><div><h2>{copy.welcomeHeading}</h2><p>{copy.welcomeSummary}</p></div><details><summary>{copy.welcomeDetailsHeading}</summary><p className={styles.small}>{copy.termsWelcome}</p><p className={styles.small}>{copy.welcomeSeparate}</p><p className={styles.small}>{copy.welcomeDetails}</p></details></aside>}
 <section className={`${styles.account} ${status?.complimentary?styles.complimentaryAccount:''}`} aria-labelledby="account-heading"><div><p className={styles.eyebrow}>{copy.yourAccount}</p><h2 id="account-heading">{signedIn?(status.complimentary?copy.complimentaryActive:status.premium?copy.paidActive:copy.personalAccess):copy.signInHeading}</h2>
 {signedIn?<><p className={styles.email}><bdi>{status.email}</bdi></p>{status.complimentary&&<p className={styles.small}>{copy.complimentaryDescription}</p>}{status.premium&&status.planDetailsUnavailable&&<p className={styles.small}>{copy.planDetailsUnavailable}</p>}{!status.premium&&<p><MembershipText text={copy.freeUsage} params={{count:number(status.used),limit:number(status.limit),date:date(status.resetsAt)}}/></p>}
 {!status.premium&&status.trialAvailable&&status.trialUsed<status.trialLimit&&<p><MembershipText text={copy.trialRemaining} params={{count:number(status.trialLimit-status.trialUsed)}}/> {status.trialEndsAt?membershipText(copy.trialEnds,{date:date(status.trialEndsAt,true)}):copy.trialNotStarted}</p>}
 {status.reserved>0&&<p><MembershipText text={copy.inProgress} params={{count:number(status.reserved)}}/></p>}</>:<p>{copy.signInIntro}</p>}</div>
 {signedIn?<div className={styles.actions}>{!native&&(!status.complimentary||status.paidAccess)&&(status.premium?<button className={styles.primary} disabled={busy} onClick={()=>run('portal',{})}>{copy.manage}</button>:<button className={styles.primary} disabled={busy} onClick={upgrade}>{copy.upgrade}</button>)}{returnHref&&<a className={styles.continueLink} href={returnHref}>{copy.continueSearch} {dir==='rtl'?'←':'→'}</a>}<button className={styles.secondary} disabled={busy} onClick={()=>run('auth',{action:'signout'})}>{copy.signOut}</button></div>:status===null?<p role="status">{message?copy.accountUnavailable:copy.loadingAccount}</p>:<div className={styles.auth}><form onSubmit={e=>{e.preventDefault();run('auth',{action:'send',email});}}><label>{copy.email}<input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setCodeSent(false);setCode('');setAuthFeedback(null);setAuthError(false);}} autoComplete="email" placeholder={copy.emailPlaceholder}/></label><button className={styles.primary} disabled={busy||!email}>{copy.emailCode}</button></form>{codeSent&&<form onSubmit={e=>{e.preventDefault();run('auth',{action:'verify',email,code});}}><label>{copy.code}<input ref={codeInput} required value={code} aria-invalid={authError&&authFeedback==='errorCode'} aria-describedby={authFeedback?'signin-feedback':undefined} onChange={e=>{setCode(e.target.value);setAuthFeedback(null);setAuthError(false);}} inputMode="numeric" autoComplete="one-time-code" placeholder={copy.codePlaceholder}/></label><button className={styles.secondary} disabled={busy||!email||!code}>{copy.verify}</button></form>}{(busy||authFeedback)&&<p id="signin-feedback" role={authError?'alert':'status'} aria-live={authError?'assertive':'polite'} className={authError?styles.authError:styles.authHint}>{busy?copy.working:authFeedback?copy[authFeedback]:''}</p>}</div>}
 </section>
 <div className={styles.feedback}><p role="status" aria-live="polite">{signedIn&&busy?copy.working:message?copy[message]:''}</p>{status===null&&message&&<button className={styles.secondary} disabled={busy} onClick={()=>refresh().then(()=>setMessage(null)).catch(()=>setMessage('accountError'))}>{copy.tryAgain}</button>}</div>
 {status!==null&&!native&&!status?.complimentary&&<section className={styles.options} aria-labelledby="personal-access"><h2 id="personal-access" ref={accessOptions} tabIndex={-1}>{copy.travelHeading}</h2><p className={styles.sectionIntro}>{copy.travelIntro}</p>
 <div className={styles.travelPlans}>{planCard('pass7',copy.pass7,copy.duration7,copy.ends7)}{planCard('pass14',copy.pass14,copy.duration14,copy.ends14)}{planCard('pass30',copy.pass30,copy.duration30,copy.ends30)}</div>
 <div className={styles.regularHeading}><h2>{copy.regularHeading}</h2><p className={styles.sectionIntro}>{copy.regularIntro}</p></div>
 <div className={styles.regularPlans}>{planCard('monthly',copy.monthly,copy.perMonth,copy.monthlyRenewal)}{planCard('annual',copy.annual,copy.perYear,copy.annualRenewal)}</div>
 <p className={styles.terms}>{copy.cancellation}</p>
 {!signedIn&&<p className={styles.signInHint}>{copy.signInToChoose}</p>}{status?.premium&&<p className={styles.signInHint}>{copy.alreadyPaid}</p>}
 </section>}
 {status!==null&&native&&android&&!status?.complimentary&&<PlayOptions signedIn={signedIn} premium={!!status?.premium} activePlans={status?.activePlayPlans||[]} onChange={refresh}/>}
 {native&&!android&&!status?.complimentary&&<p className={styles.previewNotice}>{copy.nativeUnavailable}</p>}
 {status?.complimentary&&status.paidAccess&&native&&android&&<a className={styles.back} href="https://play.google.com/store/account/subscriptions?package=global.medicea.app">{copy.manage}</a>}
 {status?.canManageComplimentary&&<nav className={styles.ownerTools} aria-label={copy.ownerTools}><span>{copy.ownerTools}</span><a href="/membership/complimentary">{copy.manageComplimentary} <span aria-hidden="true">{dir==='rtl'?'←':'→'}</span></a></nav>}
 <footer className={styles.footer}><p>{copy.personalOnly}</p><p>{copy.education}</p><MembershipFooter/></footer>
 </main>;
}
