'use client';
import {useEffect} from 'react';
import {useMembershipCopy,MembershipText,type MembershipKey} from '@/app/i18n/membership';
import MembershipFooter from '@/app/components/MembershipFooter';
import LanguageButton from '@/app/components/LanguageButton';
import styles from './information.module.css';
export default function InformationContent(){
 const {copy,dir}=useMembershipCopy();
 useEffect(()=>{document.title=copy.informationHeading+' · medicéa';},[copy.informationHeading]);
 const paragraphs=(keys:MembershipKey[])=>keys.map(key=><p key={key}><MembershipText text={copy[key]}/></p>);
 return <main className={styles.page} dir={dir}>
  <header><a href="/" aria-label={copy.backHome}><img src="/logo.png" alt="medicéa" width="160"/></a><div className={styles.headerActions}><a href="/membership">{copy.backAccount}</a><LanguageButton/></div></header>
  <h1>{copy.informationHeading}</h1><p className={styles.notice}>{copy.informationNotice}</p>
  <section id="terms"><h2>{copy.terms}</h2>{paragraphs(['termsPersonal','termsWelcome','termsTravel','termsSubscription','termsSearch'])}</section>
  <section id="privacy"><h2>{copy.privacy}</h2>{paragraphs(['privacyAccount','privacySearch','privacyBrowser','privacyProviders','privacyAnalytics','privacyContact'])}</section>
  <section id="disclaimer"><h2>{copy.disclaimer}</h2>{paragraphs(['disclaimerPurpose','disclaimerAccuracy','disclaimerUrgent'])}</section>
  <MembershipFooter/>
 </main>;
}
