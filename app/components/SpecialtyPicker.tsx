'use client';
import {useRef,useState} from 'react';
import {filteredSpecialtyGroups} from '../lib/care-specialties';
import {specialtyPickerNodes,type SpecialtyNode} from '../lib/care-specialty-navigation';
export default function SpecialtyPicker({value,onChange,labels,lang,placeholder}:{value:string;onChange:(value:string)=>void;labels:Record<string,string>;lang:string;placeholder:string}) {
 const [filter,setFilter]=useState('');
 const picker=useRef<HTMLDetailsElement>(null);
 const groups=filteredSpecialtyGroups(labels,lang,filter);
 const nodes=specialtyPickerNodes(labels,lang,filter);
 const allGroups=filteredSpecialtyGroups(labels,lang);
 const it=lang==='it',custom=value.startsWith('custom:');
 const selected=allGroups.flatMap(group=>group.items).find(item=>item.id===value||item.legacyIds.includes(value));
 function choose(id:string){onChange(id==='other_unlisted'?'custom:':id);setFilter('');if(picker.current)picker.current.open=false;}
 function choice(item:typeof groups[number]['items'][number]){return <button type="button" className="specialty-choice" key={item.id} aria-pressed={item.id===selected?.id} onClick={()=>choose(item.id)}>{item.label}{item.id===selected?.id?' ✓':''}</button>;}
 function renderNode(node:SpecialtyNode):React.ReactNode{return node.children.length?<details className="specialty-group" key={`${node.id}:${filter}`} open={filter.trim()?true:undefined}><summary>{node.label}</summary><div className="specialty-children">{node.children.map(renderNode)}</div></details>:node.item?choice(node.item):null;}

 return <div className="specialty-picker">
  <details className="specialty-menu" ref={picker}>
   <summary>{selected?.label||(custom?(it?'Altra specialità':'Other specialty'):placeholder)}</summary>
   <label>{it?'Filtra le specialità':'Filter specialties'}<input type="search" value={filter} onChange={event=>setFilter(event.target.value)} placeholder={it?'Es. colesterolo, cuore, reni':'E.g. cholesterol, heart, kidney'} /></label>
   <div className="specialty-options" role="group" aria-label={placeholder}>
    {!nodes.length&&<p>{it?'Nessuna specialità trovata':'No matching specialties'}</p>}
    {nodes.map(renderNode)}
    {!!filter&&!groups.some(group=>group.items.some(item=>item.id==='other_unlisted'))&&choice(allGroups.flatMap(group=>group.items).find(item=>item.id==='other_unlisted')!)}
   </div>
  </details>
  {custom&&<label>{it?'Nome della specialità':'Specialty name'}<input type="text" maxLength={120} value={value.slice(7)} onChange={event=>onChange(`custom:${event.target.value}`)} /></label>}
 </div>;
}
