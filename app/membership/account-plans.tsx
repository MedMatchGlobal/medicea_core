'use client';
import type {PlanSummary} from '@/lib/membership/active-plans';
import {useMembershipCopy} from '../i18n/membership';
import styles from './membership.module.css';

export default function AccountPlans({plans}:{plans:PlanSummary[]}){
  const {copy,lang}=useMembershipCopy();
  const locale=lang==='en'?'en-GB':lang;
  const date=(value:string)=>new Date(value).toLocaleDateString(locale,{day:'numeric',month:'long',year:'numeric'});
  const name=(plan:PlanSummary['plan'])=>copy[plan];
  return <div className={styles.planSummary} aria-label="Current paid access">{plans.map((plan,index)=>{
    const price=plan.currency&&plan.amountMinor!==null?new Intl.NumberFormat(locale,{style:'currency',currency:plan.currency}).format(plan.amountMinor/100):null;
    const next=plan.scheduledChange;
    return <div key={index}>
      <p className={styles.small}>CURRENT PLAN · ACTIVE NOW</p>
      <p><strong>{name(plan.plan)}</strong>{price&&<> · <bdi>{price}</bdi>{plan.plan==='monthly'?` ${copy.perMonth}`:plan.plan==='annual'?` ${copy.perYear}`:''}</>}</p>
      {plan.periodEndsAt&&<p className={styles.small}>{plan.plan.startsWith('pass')||plan.cancelAtPeriodEnd||next?'Paid access through':'Renews on'} {date(plan.periodEndsAt)}{plan.cancelAtPeriodEnd?' · Renewal cancelled':''}</p>}
      {next&&<div className={styles.scheduled}><p className={styles.small}>NEXT PLAN · SCHEDULED, NOT ACTIVE YET</p><p><strong>{name(next.plan)}</strong> · <bdi>{new Intl.NumberFormat(locale,{style:'currency',currency:next.currency}).format(next.amountMinor/100)}</bdi>{next.plan==='monthly'?` ${copy.perMonth}`:` ${copy.perYear}`}</p><p>Starts {date(next.startsAt)}, after your current plan ends.</p><p className={styles.small}>Your current plan stays active until then. This is the price on your existing scheduled change.</p></div>}
      {plan.scheduledChangeUnavailable&&<p className={styles.small}>Scheduled change details are unavailable. Check Stripe before making another change.</p>}
    </div>;
  })}</div>;
}
