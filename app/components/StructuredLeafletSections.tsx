import type {LeafletSection} from '../lib/leaflet-contract';
export default function StructuredLeafletSections({sections,headings={},lang='en',notice}:{sections:LeafletSection[];headings?:Record<string,string>;lang?:string;notice?:string}){
 return <div className="structured-medicine-leaflet">{notice&&<p className="search-note">{notice}</p>}{sections.map(section=><section key={section.key} style={{marginBottom:12}}><strong>{lang==='en'&&section.key==='Strength'?'Strengths':headings[section.key]||section.key}:</strong><ul style={{listStyleType:'disc',paddingInlineStart:22,margin:'6px 0'}}>{section.bullets.map((bullet,i)=><li key={i} style={{marginBottom:4}}>{bullet}</li>)}</ul></section>)}</div>;
}
