export type SearchKind='matches'|'leaflet'|'information'|'text'|'plain';
function meaningful(value:unknown):value is string {
 return typeof value==='string'&&!!value.trim()&&!['No response.','No response','No content received.','No leaflet generated.'].includes(value.trim());
}
export function successfulSearch(kind:SearchKind,body:any) {
 if(!body||body.error)return false;
 if(kind==='matches') {
  const composition=body.originProfile?.active_ingredients;
  return Array.isArray(composition)&&composition.some((item:any)=>meaningful(item?.name)&&meaningful(item?.strength))&&meaningful(body.equivalentResults?.raw_text);
 }
 if(kind==='leaflet')return meaningful(body.leaflet?.leaflet_text);
 if(kind==='information')return Array.isArray(body.sections)&&body.sections.some((section:any)=>Array.isArray(section?.bullets)&&section.bullets.some(meaningful));
 if(kind==='plain')return meaningful(body);
 return meaningful(body.response)||meaningful(body.result);
}
