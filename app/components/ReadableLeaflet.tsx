import {Fragment} from 'react';
import {leafletSections} from '../lib/leaflet-sections';
import {sourceLabels} from './StructuredLeafletSections';

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
 const first=text.search(/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*{1,2})?(?:Manufacturer|Description|Overview|What it is|Active Ingredients?|Mechanism of Action|How it Works|Uses|Indications|Posology|Strength|Formulation|Dosage|Interactions|Side Effects|Precautions|Contraindications|Warnings|Legal Classification|Storage|Average Selling Price|Note|Disclaimer)(?:[ \t:*]|$)/mi);
 const introduction=sections.length&&first>0?text.slice(0,first).trim():'';
 const blocks=sections.length?[...(introduction?[{key:'',text:introduction}]:[]),...sections]:[{key:'',text}];
 const rendered=blocks.filter(block=>!omitComposition||!['Active Ingredient','Active Ingredients','Strength','Formulation'].includes(block.key)).map((block,index)=>{
  const groups:Array<{list:boolean;lines:string[]}>=[];
  for(const raw of block.text.split(/\r?\n/)){
   const line=raw.trim();if(!line){if(groups.length)groups.push({list:false,lines:[]});continue;}
   const match=line.match(/^(?:[-*•–—]|\d+[.)])\s+(.+)$/),list=!!match;
   let group=groups[groups.length-1];if(!group||group.list!==list){group={list,lines:[]};groups.push(group);}group.lines.push(match?match[1]:line);
  }
  const tone=/^(?:Contraindications|Warnings|Precautions)$/.test(block.key)?' leaflet-section--caution':block.key==='Average Selling Price'?' leaflet-section--price':'';
  return <section className={'leaflet-section'+tone} key={index}>{block.key&&<h4>{headings[block.key]||block.key}</h4>}{groups.filter(group=>group.lines.length).map((group,i)=>group.list?<ul key={i}>{group.lines.map((line,j)=><li key={j}>{inline(line)}</li>)}</ul>:<p key={i}>{inline(group.lines.join(' '))}</p>)}</section>;
 });
 return <div className="readable-leaflet">{rendered}{!!sources.length&&<details className="leaflet-references"><summary>{sourceLabels[lang]||sourceLabels.en} ({sources.length})</summary><ol>{sources.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" title={url}>{new URL(url).hostname} ↗</a></li>)}</ol></details>}</div>;
}
