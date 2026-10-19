import type {VeterinarySection} from '../lib/veterinary-sections';
import {veterinarySectionLabels} from '../i18n/veterinary-sections';
import {LEAFLET_TOPICS,type LeafletSection} from '../lib/leaflet-contract';
import StructuredLeafletSections from './StructuredLeafletSections';
export default function VeterinaryLeafletSections({sections, lang, headings}: {
  sections:VeterinarySection[]; lang:string; headings:Record<string,string>;
}) {
  const labels = veterinarySectionLabels(lang);
  if(sections.length===LEAFLET_TOPICS.length&&sections.every((s,i)=>s.key===LEAFLET_TOPICS[i]))return <StructuredLeafletSections sections={sections as LeafletSection[]} lang={lang} headings={headings}/>;
  return <div className="structured-veterinary-leaflet">
    {sections.map(section => <section key={section.key}>
      <strong>{section.key === 'Formulation' ? labels.formulation : section.key === 'Animal Species' ? labels.species : headings[section.key] || section.key}:</strong>
      <ul>{(section.bullets.length ? section.bullets : [labels.unknown]).map((bullet,index) => <li key={index}>{bullet}</li>)}</ul>
    </section>)}
  </div>;
}
