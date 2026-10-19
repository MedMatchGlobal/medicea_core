// Stable presentation contract. Strength is the internal/localisation key;
// the English heading is Strengths. Generation and every Dev renderer share it.
export const LEAFLET_TOPICS=['Active Ingredients','Strength','Formulation','Indications','Contraindications','Precautions','Side Effects','Interactions','Legal Classification','Manufacturer','Average Selling Price'] as const;
export type LeafletTopic=typeof LEAFLET_TOPICS[number];
export type LeafletSection={key:LeafletTopic;bullets:string[]};
export const LEAFLET_RESPONSE_FORMAT={type:'json_schema',json_schema:{name:'medicea_leaflet_v2',strict:true,schema:{type:'object',additionalProperties:false,required:['information_sections'],properties:{information_sections:{type:'object',additionalProperties:false,required:[...LEAFLET_TOPICS],properties:Object.fromEntries(LEAFLET_TOPICS.map(key=>[key,{type:'array',items:{type:'string'}}]))}}}}};
export function validateLeaflet(value:unknown):LeafletSection[]{
 const obj=value as any,sections=obj?.information_sections;
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).length!==1||!sections||typeof sections!=='object'||Array.isArray(sections)||Object.keys(sections).length!==LEAFLET_TOPICS.length)throw Error('INVALID_LEAFLET_STRUCTURE');
 return LEAFLET_TOPICS.map(key=>{
  const values=sections[key];if(!Array.isArray(values)||values.length>12||values.some(v=>typeof v!=='string'||!v.trim()||v.length>600||/[\r\n<>]/.test(v)))throw Error('INVALID_LEAFLET_BULLETS');
  const bullets=values.map((v:string)=>v.trim().replace(/^(?:[-*•]|\d+[.)])\s+/,'').replace(/\*\*|__/g,''));
  if(bullets.some((v:string)=>!v.trim()))throw Error('INVALID_LEAFLET_BULLETS');return {key,bullets};
 });
}
export function leafletText(sections:LeafletSection[],unknown:string){return sections.map(s=>s.key+'\n'+(s.bullets.length?s.bullets:[unknown]).map(v=>'- '+v).join('\n')).join('\n\n');}
export function readStructuredLeaflet(text:string):LeafletSection[]|null{
 const legacy=text.split(/\r?\n/).some(s=>s.trim()==='Dosage');
 const hasStorage=text.split(/\r?\n/).some(s=>s.trim()==='Storage');
 const currentTopics=hasStorage?[...LEAFLET_TOPICS.slice(0,9),'Storage',...LEAFLET_TOPICS.slice(9)]:[...LEAFLET_TOPICS];
 const topics=legacy?currentTopics.map(k=>k==='Formulation'?'Dosage':k):currentTopics;
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),sections:LeafletSection[]=[];
 for(const line of lines){if(line===topics[sections.length]){sections.push({key:line as LeafletTopic,bullets:[]});continue;}if(!sections.length||!line.startsWith('- '))return null;sections[sections.length-1].bullets.push(line.slice(2));}
 if(sections.length!==topics.length||!sections.every(s=>s.bullets.length))return null;
 // Old snapshots remain stored intact; do not relabel their dosing text as formulation.
 return sections.filter(s=>String(s.key)!=='Storage').map(s=>String(s.key)==='Dosage'?{key:'Formulation',bullets:[]}:s);
}
