import {Fragment} from 'react';
import {leafletSections} from '../lib/leaflet-sections';
import {sourceLabels} from './StructuredLeafletSections';
import {leafletPresentationCopy} from '../i18n/leaflet-presentation';

// Presentation only. Preserve prose, bullets and their order; never summarise
// clinical text or make a new model request to tidy an existing leaflet.
export default function ReadableLeaflet({text,headings={},lang='en',sourceUrls=[],omitComposition=false}:{text:string;headings?:Record<string,string>;lang?:string;sourceUrls?:string[];omitComposition?:boolean}){
 const sources:string[]=[];
 function reference(raw:string){
  try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
   let index=sources.indexOf(url.href);if(index<0){sources.push(url.href);index=sources.length-1;}return {url:url.href,index:index+1};
  }catch{return null;}
 }
 for(const url of sourceUrls)reference(url);
 function inline(value:string){
  const pieces=value.split(/(\[[^\]]*\]\(https?:\/\/[^\s]+?\)|https?:\/\/[^\s<>]+)/g);
  return pieces.map((piece,index)=>{
   const markdown=piece.match(/^\[([^\]]*)\]\((https?:\/\/[^\s]+?)\)$/);
   const raw=markdown?markdown[2]:piece.replace(/[),.;]+$/,'');
   if(!/^https?:\/\//.test(raw))return <Fragment key={index}>{piece.replace(/\*\*|__/g,'')}</Fragment>;
   const ref=reference(raw);if(!ref)return <Fragment key={index}>{piece}</Fragment>;
   const label=markdown?.[1],tail=markdown?'':piece.slice(raw.length);
   return <Fragment key={index}>{label&&<>{label} </>}<a className="leaflet-reference" href={ref.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" title={ref.url} aria-label={`${sourceLabels[lang]||sourceLabels.en} ${ref.index}: ${new URL(ref.url).hostname}`}>[{ref.index}]</a>{tail}</Fragment>;
  });
 }
 const sections=leafletSections(text);
 // The heading parser starts at the first recognised heading. Keep any opening
 // explanation too, including ambiguity notices about product families.
 const first=text.search(/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*{1,2})?(?:Summary|Manufacturer|Description|Overview|What it is|Active Ingredients?|Mechanism of Action|How it Works|Uses|Indications|Posology|Strength|Formulation|Dosage|Interactions|Side Effects|Precautions|Contraindications|Warnings|Legal Classification|Storage|Average Selling Price|Note|Disclaimer)(?:[ \t:*]|$)/mi);
 const introduction=sections.length&&first>0?text.slice(0,first).trim():'';
 const copy=leafletPresentationCopy(lang);
 // Existing snapshots can use their own indication text as the overview. Never
 // invent a new clinical statement or turn provenance notes into a drug summary.
 const indications=sections.find(section=>['Indications','Uses'].includes(section.key));
 const fallback=indications?.text.split(/\r?\n/).map(line=>line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '')).find(Boolean);
 const summary=sections.find(section=>section.key==='Summary')|| (fallback?{key:'Summary',text:(fallback.match(/^.*?[.!?](?:\s|$)/)?.[0]||fallback).trim()}:null);
 const notes=sections.filter(section=>section.key==='Note');
 const blocks=sections.length?[...(summary?[summary]:[]),...(!summary&&introduction?[{key:'',text:introduction}]:[]),...sections.filter(section=>!['Note','Summary'].includes(section.key))]:[{key:'',text}];
 const renderBlock=(block:{key:string;text:string},index:number)=>{
  const groups:Array<{list:boolean;lines:string[]}>=[];
  for(const raw of block.text.split(/\r?\n/)){
   const line=raw.trim();if(!line){if(groups.length)groups.push({list:false,lines:[]});continue;}
   const match=line.match(/^(?:[-*•–—]|\d+[.)])\s+(.+)$/),list=!!match;
   let group=groups[groups.length-1];if(!group||group.list!==list){group={list,lines:[]};groups.push(group);}group.lines.push(match?match[1]:line);
  }
  const tone=/^(?:Contraindications|Warnings|Precautions)$/.test(block.key)?' leaflet-section--caution':block.key==='Average Selling Price'?' leaflet-section--price':'';
  return <section className={'leaflet-section'+tone} key={index}>{block.key&&<h4>{block.key==='Summary'?copy.summary:headings[block.key]||block.key}</h4>}{groups.filter(group=>group.lines.length).map((group,i)=>group.list?<ul key={i}>{group.lines.map((line,j)=><li key={j}>{inline(line)}</li>)}</ul>:<p key={i}>{inline(group.lines.join(' '))}</p>)}</section>;
 };
 const rendered=blocks.filter(block=>!omitComposition||!['Active Ingredient','Active Ingredients','Strength','Formulation'].includes(block.key)).map(renderBlock);
 const extra=[...(summary&&introduction?[{key:'',text:introduction}]:[]),...notes.map(note=>({...note,key:''}))].map(renderBlock);
 return <div className="readable-leaflet">{rendered}{!!extra.length&&<details className="leaflet-references"><summary>{copy.details}</summary>{extra}</details>}{!!sources.length&&<details className="leaflet-references"><summary>{sourceLabels[lang]||sourceLabels.en} ({sources.length})</summary><ol>{sources.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" title={url}>{new URL(url).hostname} ↗</a></li>)}</ol></details>}</div>;
}
