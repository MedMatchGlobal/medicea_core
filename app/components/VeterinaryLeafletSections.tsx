import type {VeterinarySection} from '../lib/veterinary-sections';
import {veterinarySectionLabels} from '../i18n/veterinary-sections';
import {LEAFLET_TOPICS,type LeafletSection} from '../lib/leaflet-contract';
import StructuredLeafletSections from './StructuredLeafletSections';
export default function VeterinaryLeafletSections({sections, lang, headings, country=''}: {
  sections:VeterinarySection[]; country?:string; lang:string; headings:Record<string,string>;
}) {
  const labels = veterinarySectionLabels(lang);
  const currentSections=sections.filter(s=>s.key!=='Storage');
  if(currentSections.length===LEAFLET_TOPICS.length&&currentSections.every((s,i)=>s.key===LEAFLET_TOPICS[i]||(i===2&&s.key==='Dosage')))return <StructuredLeafletSections sections={currentSections.map(s=>s.key==='Dosage'?{key:'Formulation',bullets:[]}:s) as LeafletSection[]} country={country} lang={lang} headings={headings}/>;
  return <div className="structured-veterinary-leaflet">
    {sections.map(section => <section key={section.key}>
      <strong>{section.key === 'Formulation' ? labels.formulation : section.key === 'Animal Species' ? labels.species : headings[section.key] || section.key}:</strong>
      <ul>{(section.bullets.length ? section.bullets : [labels.unknown]).map((bullet,index) => <li key={index}>{bullet}</li>)}</ul>
    </section>)}
  </div>;
}
