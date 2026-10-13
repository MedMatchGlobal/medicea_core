'use client';
import styles from './MembershipFooter.module.css';
import {useMembershipCopy} from '../i18n/membership';
export default function MembershipFooter(){
 const {copy}=useMembershipCopy();
 return <nav className={styles.links} aria-label={copy.footerLabel}>
  <a href="/membership/information#terms">{copy.terms}</a>
  <a href="/membership/information#privacy">{copy.privacy}</a>
  <a href="/membership/information#disclaimer">{copy.disclaimer}</a>
  <a href="mailto:support@medicea.global">{copy.contact}</a>
 </nav>;
}
