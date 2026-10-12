import type {VeterinarySection} from '../lib/veterinary-sections';
import {veterinarySectionLabels} from '../i18n/veterinary-sections';
export default function VeterinaryLeafletSections({sections, lang, headings}: {
  sections:VeterinarySection[]; lang:string; headings:Record<string,string>;
}) {
  const labels = veterinarySectionLabels(lang);
  return <div className="structured-veterinary-leaflet">
    {sections.map(section => <section key={section.key}>
      <strong>{section.key === 'Formulation' ? labels.formulation : section.key === 'Animal Species' ? labels.species : headings[section.key] || section.key}:</strong>
      <ul>{(section.bullets.length ? section.bullets : [labels.unknown]).map((bullet,index) => <li key={index}>{bullet}</li>)}</ul>
    </section>)}
  </div>;
}
