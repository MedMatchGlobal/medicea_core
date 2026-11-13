import {filteredSpecialtyGroups} from './care-specialties';
type Choice=ReturnType<typeof filteredSpecialtyGroups>[number]['items'][number];
export type SpecialtyNode={id:string;label:string;item?:Choice;children:SpecialtyNode[]};
/** Navigation groups only: product labels, search terms and CSV identities stay intact. */
export function specialtyPickerNodes(labels:Record<string,string>={},lang='en',filter=''):SpecialtyNode[]{
 const groups=filteredSpecialtyGroups(labels,lang);
 const leaf=(item:Choice):SpecialtyNode=>({id:item.id,label:item.label,item,children:[]});
 const nodes:SpecialtyNode[]=groups.map(group=>group.items.length>1?{id:group.id,label:group.label,children:group.items.map(leaf)}:leaf(group.items[0]));
 function take(ids:string[]){const found:SpecialtyNode[]=[];for(const id of ids){const index=nodes.findIndex(node=>node.id===id);if(index>=0)found.push(...nodes.splice(index,1));}return found;}
 function append(parent:string,ids:string[]){const node=nodes.find(node=>node.id===parent);if(node)node.children.push(...take(ids));}
 append('fertility_and_assisted_reproduction',['midwifery','gender_affirming_medicine']);
 append('paediatrics',['child_and_adolescent_psychiatry','child_psychology','paediatric_dentistry','paediatric_dentistry_children']);
 append('psychiatry',['addiction_medicine','clinical_neurophysiology','neuropsychology','sleep_medicine','sleep_medicine_neurological']);
 function umbrella(id:string,label:string,ids:string[]){const position=Math.min(...ids.map(id=>nodes.findIndex(node=>node.id===id)).filter(index=>index>=0));const node:SpecialtyNode={id,label,children:take(ids)};nodes.splice(Number.isFinite(position)?position:nodes.length,0,node);return node;}
 const oncology=umbrella('umbrella_oncology',lang==='it'?'Oncologia e cure oncologiche':'Oncology and cancer care',['medical_oncology','clinical_oncology','radiation_oncology','surgical_oncology_2']);
 // Bring cancer-specific services from other parent groups under this umbrella too.
 function collectCancer(list:SpecialtyNode[]){for(let i=0;i<list.length;){const node=list[i];if(node===oncology){i++;continue;}if(node.item&&/oncolog|cancer/i.test(node.item.id)){oncology.children.push(...list.splice(i,1));}else{collectCancer(node.children);i++;}}}
 collectCancer(nodes);
 umbrella('umbrella_sexual_health',lang==='it'?'Salute sessuale e andrologia':'Sexual health and andrology',['andrology_male_reproductive_health','sexual_medicine_sexology','sexual_health_genitourinary_medicine']);
 const dental=groups.filter(group=>group.items[0].kind==='dental'&&group.id!=='paediatric_dentistry_children').map(group=>group.id);
 umbrella('umbrella_dental',lang==='it'?'Odontoiatria e salute orale':'Dental and oral health',['oral_and_maxillofacial_surgery',...dental]);
 umbrella('umbrella_radiology',lang==='it'?'Radiologia e diagnostica per immagini':'Radiology and imaging',['radiology','interventional_radiology','nuclear_medicine','radiography_and_sonography']);
 const needle=filter.trim().toLocaleLowerCase();
 function matches(node:SpecialtyNode){return `${node.label} ${node.item?.query||''} ${node.item?.aliases||''}`.toLocaleLowerCase().includes(needle);}
 function prune(list:SpecialtyNode[]):SpecialtyNode[]{return list.flatMap(node=>{if(!needle||matches(node))return [node];const children=prune(node.children);return children.length?[{...node,children}]:[];});}
 const collator=new Intl.Collator(lang,{sensitivity:'base',numeric:true});
 function alphabetize(list:SpecialtyNode[]):SpecialtyNode[]{return list.map(node=>({...node,children:alphabetize(node.children)})).sort((a,b)=>{
  return collator.compare(a.label,b.label);
 });}
 return alphabetize(prune(nodes));
}
