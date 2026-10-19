import {veterinarySectionLabels} from '../i18n/veterinary-sections';
import type {LeafletSection} from '../lib/leaflet-contract';
function priceText(text:string){return text.split(/(https:\/\/[^\s<>]+)/g).map((part,i)=>{
 if(!part.startsWith('https://'))return part;
 try{const u=new URL(part);if(!u.username&&!u.password&&!u.port)return <a key={i} href={u.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" style={{overflowWrap:'anywhere'}}>{u.hostname} ↗</a>;}catch{}
 return part;
});}
export default function StructuredLeafletSections({sections,headings={},lang='en',notice}:{sections:LeafletSection[];headings?:Record<string,string>;lang?:string;notice?:string}){
 return <div className="structured-medicine-leaflet">{notice&&<p className="search-note">{notice}</p>}{sections.map(section=><section key={section.key} style={{marginBottom:12}}><strong>{lang==='en'&&section.key==='Strength'?'Strengths':section.key==='Formulation'?(lang==='en'?'Formulations':veterinarySectionLabels(lang).formulation):headings[section.key]||section.key}:</strong><ul style={{listStyleType:'disc',paddingInlineStart:22,margin:'6px 0'}}>{(section.bullets.length?section.bullets:[veterinarySectionLabels(lang).unknown]).map((bullet,i)=><li key={i} style={{marginBottom:4}}>{section.key==='Average Selling Price'?priceText(bullet):bullet}</li>)}</ul></section>)}</div>;
}
