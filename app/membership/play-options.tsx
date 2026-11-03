'use client';
import {useEffect,useState} from 'react';
import {PlayBilling,type NativeOffer,type NativePurchase} from '../lib/play-client';
import {PLAY_PLANS,type PlayPlan} from '@/lib/membership/play-catalogue';
import styles from './membership.module.css';
import {useMembershipCopy} from '../i18n/membership';
// This component is imported only by the native membership UI. Prices come from
// Play ProductDetails in the buyer's currency, never from GBP marketing constants.
export default function PlayOptions({signedIn,premium,activePlans,onChange}:{signedIn:boolean;premium:boolean;activePlans:PlayPlan[];onChange:()=>Promise<unknown>}){
 const {copy}=useMembershipCopy();
 const [offers,setOffers]=useState<NativeOffer[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function config(){const r=await fetch('/api/membership/play',{cache:'no-store'});if(!r.ok)throw Error('Google Play testing is unavailable. Sign in and try again.');return r.json();}
 async function verify(purchases:NativePurchase[]){
  let pending=false;
  for(const p of purchases){
   if(p.state!==1){pending=true;continue;}
   // Try only allowlisted plans; backend independently validates the base plan.
   const candidates=(Object.keys(PLAY_PLANS) as PlayPlan[]).filter(k=>p.products.includes(PLAY_PLANS[k].product));
   let ok=false;for(const plan of candidates){const r=await fetch('/api/membership/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,token:p.token})});if(r.ok){ok=true;break;}}
   if(!ok)throw Error('Purchase verification is pending. Use Restore purchases to retry.');
  }
  const restored=await fetch('/api/membership/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({restore:true})});
  if(!restored.ok)throw Error('Account restore is pending. Please retry.');
  await onChange();setMessage(pending?'Payment pending. Access starts after Google confirms payment.':'Purchases checked. Your account shows your current access.');
 }
 async function restore(){setBusy(true);try{await config();await verify((await PlayBilling.restore()).purchases);}catch(e){setMessage(e instanceof Error?e.message:'Restore unavailable');}finally{setBusy(false);}}
 useEffect(()=>{let active=true;if(signedIn){void config().then(async c=>{
  const found:NativeOffer[]=[];
  for(const type of ['inapp','subs']){
   const items=Object.values(c.plans).filter((p:any)=>p.type===type).map((p:any)=>({product:p.product,type:p.type}));
   found.push(...(await PlayBilling.products({items})).offers);
  }
  if(active)setOffers(found);
 }).catch(()=>{if(active)setMessage('Google Play test products are unavailable.');});}
 const resume=()=>{if(document.visibilityState==='visible'&&signedIn)void restore();};document.addEventListener('visibilitychange',resume);
 return()=>{active=false;document.removeEventListener('visibilitychange',resume);};},[signedIn]);
 async function buy(plan:PlayPlan,offer:NativeOffer){setBusy(true);setMessage('');try{const c=await config();await verify((await PlayBilling.purchase({...offer,account:c.account})).purchases);}catch{setMessage('Purchase was cancelled or could not complete. You can retry or restore purchases.');}finally{setBusy(false);}}
 return <section className={styles.options} aria-label="Google Play purchases"><h2>Google Play access</h2><p className={styles.sectionIntro}>Passes end automatically. Monthly and annual subscriptions renew until cancelled in Google Play.</p>
 <div className={styles.travelPlans}>{(Object.keys(PLAY_PLANS) as PlayPlan[]).map(plan=>{const p=PLAY_PLANS[plan],offer=offers.find(o=>o.product===p.product&&('basePlan' in p?o.basePlan===p.basePlan:!o.basePlan));const title=plan==='pass7'?'7-day pass':plan==='pass14'?'14-day pass':plan==='pass30'?'30-day pass':plan==='monthly'?'Monthly subscription':'Annual subscription';const active=premium&&activePlans.includes(plan);return <article className={`${styles.plan} ${active?styles.activePlan:''}`} key={plan}><h3>{title}</h3><p className={styles.price}>{offer?.price||'Unavailable'}</p><button className={active?styles.activeButton:styles.primary} disabled={!signedIn||premium||busy||!offer} onClick={()=>offer&&buy(plan,offer)}>{active?(plan.startsWith('pass')?copy.activePass:copy.activeSubscription):'Choose '+title.toLowerCase()}</button></article>;})}</div>
 <p><button className={styles.secondary} disabled={!signedIn||busy} onClick={()=>void restore()}>Restore purchases</button></p><a href="https://play.google.com/store/account/subscriptions?package=global.medicea.app">Manage Google Play subscriptions</a><p role="status" aria-live="polite">{busy?'Checking Google Play…':message}</p></section>;
}
