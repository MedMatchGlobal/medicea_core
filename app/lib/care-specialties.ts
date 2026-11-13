import catalog from './care-specialties.json';
export const CARE_SPECIALTY_GROUPS = catalog;
export function specialtySearchTerm(value:string):string {
 const key=value.trim();
 const item=catalog.flatMap(group=>group.items).find(item=>item.id===key||item.legacyIds.includes(key)||item.label.toLowerCase()===key.toLowerCase());
 return item?.query || key.replace(/^custom:/,'').trim().slice(0,120);
}
export function filteredSpecialtyGroups(labels:Record<string,string>={},lang='en',filter='') {
 const needle=filter.trim().toLocaleLowerCase();
 const localLabel=(item:typeof catalog[number]['items'][number])=>lang==='en'?item.label:labels[item.id]||item.legacyIds.map(id=>labels[id]).find(Boolean)||item.label;
 return catalog.map(group=>{
  const items=group.items.map(item=>({...item,label:localLabel(item)}));
  const matches=(item:typeof items[number])=>!needle||`${item.label} ${item.query} ${item.aliases}`.toLocaleLowerCase().includes(needle);
  // Searching a parent shows its children; searching a child retains its parent heading.
  return {...group,label:localLabel(group.items[0]),items:matches(items[0])?items:items.filter(matches)};
 }).filter(group=>group.items.length);
}
