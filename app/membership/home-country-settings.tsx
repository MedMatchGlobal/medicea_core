'use client';
import {useEffect,useState} from 'react';
import CountryPicker from '../components/CountryPicker';
import {useLanguage} from '../LanguageProvider';
import {useMembershipCopy} from '../i18n/membership';
import {homeCountryCopy} from '../i18n/home-country';
import styles from './membership.module.css';

export default function HomeCountrySettings({country,onSaved}:{country:string|null;onSaved:(country:string)=>void}) {
  const {copy,lang} = useMembershipCopy();
  const {t} = useLanguage();
  const text = homeCountryCopy(lang);
  const [selected,setSelected] = useState(country || '');
  const [saving,setSaving] = useState(false);
  const [feedback,setFeedback] = useState<'saved'|'error'|null>(null);
  useEffect(()=>{setSelected(country || '');},[country]);
  async function save() {
    setSaving(true);setFeedback(null);
    try {
      const response = await fetch('/api/membership/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({homeCountry:selected})});
      const data = await response.json();
      if (!response.ok || data.homeCountry !== selected) throw Error('Preference unavailable');
      onSaved(data.homeCountry);setFeedback('saved');
    } catch {setFeedback('error');}
    finally {setSaving(false);}
  }
  return <section className={styles.homeCountry} aria-labelledby="home-country-heading">
    <div><h2 id="home-country-heading">{text.label}</h2><p className={styles.small} id="home-country-hint">{text.hint}</p></div>
    <fieldset disabled={saving} aria-describedby="home-country-hint">
      <CountryPicker label={text.label} value={selected} onChange={value=>{setSelected(value);setFeedback(null);}}
        searchLabel={t?.ui?.searchCountry || 'Search countries'} regionLabel={t?.ui?.allRegions || 'All continents'} emptyLabel={t?.ui?.noCountries || 'No countries found'}/>
      <button type="button" className={styles.secondary} disabled={saving || !selected || selected === country} onClick={save}>{saving?copy.working:text.save}</button>
    </fieldset>
    {feedback&&<p role={feedback==='error'?'alert':'status'} className={feedback==='error'?styles.authError:styles.small}>{feedback==='saved'?copy.done:copy.errorGeneric}</p>}
  </section>;
}
