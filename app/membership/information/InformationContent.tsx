'use client';
import {useEffect} from 'react';
import {useMembershipCopy,MembershipText,type MembershipKey} from '@/app/i18n/membership';
import MembershipFooter from '@/app/components/MembershipFooter';
import LanguageButton from '@/app/components/LanguageButton';
import styles from './information.module.css';
import {BILLING_BUSINESS} from '@/lib/membership/business';
import {businessLabels} from '@/app/i18n/billing-business';
export default function InformationContent(){
 const {copy,dir,lang}=useMembershipCopy();
 const labels=businessLabels[lang]||businessLabels.en;
 useEffect(()=>{document.title=copy.informationHeading+' · medicéa';},[copy.informationHeading]);
 const paragraphs=(keys:MembershipKey[])=>keys.map(key=><p key={key}><MembershipText text={copy[key]}/></p>);
 return <main className={styles.page} dir={dir}>
  <header><a href="/" aria-label={copy.backHome}><img src="/brand/medicea-logo.svg" alt="medicéa" width="160"/></a><div className={styles.headerActions}><a href="/membership">{copy.backAccount}</a><LanguageButton/></div></header>
  <h1>{copy.informationHeading}</h1><p className={styles.notice}>{copy.informationNotice}</p>
  <section id="business" aria-labelledby="business-heading"><h2 id="business-heading">{BILLING_BUSINESS.legalName}</h2><p>{labels[0]}: <a href={BILLING_BUSINESS.companyRecord} target="_blank" rel="noopener noreferrer"><bdi>{BILLING_BUSINESS.companyNumber}</bdi></a><br/>{labels[1]}: <bdi>{BILLING_BUSINESS.vatNumber}</bdi></p><p>{labels[2]}:<br/><bdi>{BILLING_BUSINESS.address.join(', ')}</bdi></p></section>
  <section id="terms"><h2>{copy.terms}</h2>{paragraphs(['termsPersonal','termsWelcome','termsTravel','termsSubscription','termsSearch','refundPolicy'])}</section>
  <section id="preview-update" lang="en" dir="ltr" aria-labelledby="preview-update-heading">
   <h2 id="preview-update-heading">Preview policy update · 23 November 2026</h2>
   <p>This English update clarifies the draft Preview information above. It is not a notice that public sales have started.</p>
   <h3>Future purchases and personal use</h3>
   <p>A reservation starts after your current pass ends, on the date and at the price and currency you confirm. There is no charge when saving your card. You authorise the stated payment on or after the start date and can cancel the reservation before it starts. A failed payment does not grant the new paid access. Monthly and annual plans renew until cancelled; travel passes do not renew. Displayed purchase totals include applicable VAT.</p>
   <p>Access is for one person using the app manually. Account sharing, resale, automated queries and bulk extraction are not included. Up to three searches may run at once. Failed searches do not consume a successful-search allowance. There is no additional numerical paid-search allowance stated here.</p>
   <h3>Privacy requests and browser data</h3>
   <p>The controller is {BILLING_BUSINESS.legalName}, at the business address above. Contact <a href="mailto:support@medicea.global">support@medicea.global</a> to request access, correction, export or erasure of account data, or to raise a privacy complaint. We verify identity before acting. You can also complain to the <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">UK Information Commissioner</a>.</p>
   <p>Account and access records are retained while needed to operate the account and resolve outstanding purchases or requests. Financial and dispute records may need to be retained after account closure to meet legal obligations. Erasure requests are reviewed for these exceptions; there is no automatic account-deletion feature. Closing an account and stopping a subscription are separate steps: contact support to coordinate both.</p>
   <p>Saved searches remain on this device until you remove them using the saved-search controls or clear the browser’s site data. Server-side erasure cannot clear another device. Do not enter patient-identifying details. Provider processing terms, international transfer safeguards and the lawful basis for health-related inputs still require completion before public launch.</p>
  </section>
  <section id="privacy"><h2>{copy.privacy}</h2>{paragraphs(['privacyAccount','privacySearch','privacyBrowser','privacyProviders','privacyAnalytics','privacyContact'])}</section>
  <section id="disclaimer"><h2>{copy.disclaimer}</h2>{paragraphs(['disclaimerPurpose','disclaimerAccuracy','disclaimerUrgent'])}</section>
  <MembershipFooter/>
 </main>;
}
