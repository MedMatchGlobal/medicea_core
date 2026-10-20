import {priceDiagnostic} from '../lib/price-diagnostics';
import {veterinarySectionLabels} from '../i18n/veterinary-sections';
import type {LeafletSection} from '../lib/leaflet-contract';
const sourceLabels:Record<string,string>={en:'Sources',af:'Bronne',ar:'المصادر',cs:'Zdroje',da:'Kilder',de:'Quellen',el:'Πηγές',es:'Fuentes',fi:'Lähteet',fr:'Sources',he:'מקורות',hi:'स्रोत',hu:'Források',it:'Fonti',ja:'出典',ko:'출처',nl:'Bronnen',no:'Kilder',pl:'Źródła',pt:'Fontes',ro:'Surse',ru:'Источники',sv:'Källor',tr:'Kaynaklar',zh:'来源'};
// Presentation only: preserve saved facts and links, with no model processing.
export function readableBullet(text:string,sources:Set<string>){
 const collect=(raw:string)=>{try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)sources.add(u.href);}catch{}};
 return text.replace(/\[([^\]]*)\]\((https?:\/\/[^\s]+?)\)/g,(_,label:string,url:string)=>{collect(url);return /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(label.trim())?'':label;})
  .replace(/https?:\/\/[^\s<>]+/g,url=>{collect(url.replace(/[),.;]+$/,''));return '';})
  .replace(/\(\s*\)|\[\s*\]/g,'').replace(/\*\*|__/g,'').replace(/\s+([,.;:])/g,'$1').replace(/\s+/g,' ').replace(/(?:\s*[·|]\s*)+$/,'').trim();
}
export function withoutCountryPrefix(text:string,country:string){
 const name=country.trim(),value=text.trim();
 if(!name||value.slice(0,name.length).toLowerCase()!==name.toLowerCase())return text;
 const rest=value.slice(name.length),delimiter=rest.match(/^\s*[—–:-]\s+/);
 return delimiter&&rest.slice(delimiter[0].length).trim()?rest.slice(delimiter[0].length).trim():text;
}
export default function StructuredLeafletSections({sections,headings={},lang='en',notice,country='',sourceUrls=[],priceLookupDiagnostic}:{sections:LeafletSection[];headings?:Record<string,string>;lang?:string;notice?:string;country?:string;sourceUrls?:string[];priceLookupDiagnostic?:unknown}){
 const diagnostic=priceDiagnostic(priceLookupDiagnostic);
 const sources=new Set<string>(),unknown=veterinarySectionLabels(lang).unknown;
 for(const raw of sourceUrls.slice(0,10))try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)sources.add(u.href);}catch{}
 const rendered=sections.map(section=>({...section,bullets:(section.bullets.length?section.bullets:[unknown]).map(bullet=>withoutCountryPrefix(readableBullet(bullet,sources),country)||unknown)}));
 return <div className="structured-medicine-leaflet">{notice&&<p className="search-note">{notice}</p>}{rendered.map(section=><section key={section.key} style={{marginBottom:12}}><strong>{lang==='en'&&section.key==='Strength'?'Strengths':section.key==='Formulation'?(lang==='en'?'Formulations':veterinarySectionLabels(lang).formulation):headings[section.key]||section.key}:</strong><ul style={{listStyleType:'disc',paddingInlineStart:22,margin:'6px 0'}}>{section.bullets.map((bullet,i)=><li key={i} style={{marginBottom:4}}>{bullet}</li>)}</ul>{section.key==='Average Selling Price'&&diagnostic&&diagnostic!=='PRICE_FOUND'&&<p className="search-note">Price lookup diagnostic: <code>{diagnostic}</code></p>}</section>)}{!!sources.size&&<details className="leaflet-sources" style={{marginTop:16,fontSize:'0.875rem'}}><summary style={{cursor:'pointer'}}>{sourceLabels[lang]||sourceLabels.en} ({sources.size})</summary><ul>{[...sources].map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" style={{overflowWrap:'anywhere'}}>{new URL(url).hostname} ↗</a></li>)}</ul></details>}</div>;
}
