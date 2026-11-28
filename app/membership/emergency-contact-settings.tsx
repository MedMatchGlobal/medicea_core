'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from '../LanguageProvider';
import {cleanContact,loadEmergencyContact,pickContact,pickerSupported,saveEmergencyContact} from '../lib/emergency-contact';
import styles from './membership.module.css';

const EN={heading:'Emergency contact',hint:'Used by the SOS button to call or text this person. Stored only on this device, never on our servers.',name:'Name',number:'Phone number (with country code)',pick:'Choose from my contacts',save:'Save',remove:'Remove',saved:'Saved on this device.',removed:'Removed.',invalid:'Enter a valid phone number, for example +44 7700 900123.'};
const IT:typeof EN={heading:'Contatto di emergenza',hint:'Usato dal pulsante SOS per chiamare o scrivere a questa persona. Salvato solo su questo dispositivo, mai sui nostri server.',name:'Nome',number:'Numero di telefono (con prefisso internazionale)',pick:'Scegli dai miei contatti',save:'Salva',remove:'Rimuovi',saved:'Salvato su questo dispositivo.',removed:'Rimosso.',invalid:'Inserisci un numero valido, ad esempio +39 333 1234567.'};

export default function EmergencyContactSettings() {
  const {lang}=useLanguage();const c=lang==='it'?IT:EN;
  const [name,setName]=useState(''),[number,setNumber]=useState(''),[feedback,setFeedback]=useState<'saved'|'removed'|'invalid'|null>(null),[picker,setPicker]=useState(false);
  useEffect(()=>{const stored=loadEmergencyContact();if(stored){setName(stored.name);setNumber(stored.number);}setPicker(pickerSupported());},[]);
  function save(){const contact=cleanContact({name,number});if(!contact||!saveEmergencyContact(contact)){setFeedback('invalid');return;}setName(contact.name);setNumber(contact.number);setFeedback('saved');}
  function remove(){saveEmergencyContact(null);setName('');setNumber('');setFeedback('removed');}
  async function choose(){const contact=await pickContact();if(!contact)return;if(saveEmergencyContact(contact)){setName(contact.name);setNumber(contact.number);setFeedback('saved');}else setFeedback('invalid');}
  return <section className={styles.homeCountry} aria-labelledby="emergency-contact-heading">
    <div><h2 id="emergency-contact-heading">{c.heading}</h2><p className={styles.small} id="emergency-contact-hint">{c.hint}</p></div>
    <fieldset aria-describedby="emergency-contact-hint">
      {picker&&<button type="button" className={styles.secondary} onClick={choose}>{c.pick}</button>}
      <label htmlFor="emergency-contact-name">{c.name}</label>
      <input id="emergency-contact-name" type="text" autoComplete="off" maxLength={60} value={name} onChange={e=>{setName(e.target.value);setFeedback(null);}}/>
      <label htmlFor="emergency-contact-number">{c.number}</label>
      <input id="emergency-contact-number" type="tel" inputMode="tel" autoComplete="off" value={number} onChange={e=>{setNumber(e.target.value);setFeedback(null);}}/>
      <button type="button" className={styles.secondary} disabled={!number.trim()} onClick={save}>{c.save}</button>
      <button type="button" className={styles.secondary} disabled={!number.trim()&&!name.trim()} onClick={remove}>{c.remove}</button>
    </fieldset>
    {feedback&&<p role={feedback==='invalid'?'alert':'status'} className={feedback==='invalid'?styles.authError:styles.small}>{feedback==='saved'?c.saved:feedback==='removed'?c.removed:c.invalid}</p>}
  </section>;
}
