import {parseReadableLeaflet,type LeafletProfile} from '../lib/readable-leaflet';
function Body({text}:{text:string}) {
 // Preserve both prose and bullet lines. The previous formatter dropped prose
 // whenever a section contained even one bullet.
 return <>{text.split(/\n\s*\n/).filter(Boolean).map((block,index)=>{
  const lines=block.split('\n').map(s=>s.trim()).filter(Boolean);
  return <div key={index}>{lines.map((line,i)=>/^[-•*]\s+|^\d+[.)]\s+/.test(line)?<ul key={i}><li>{line.replace(/^(?:[-•*]|\d+[.)])\s+/,'')}</li></ul>:<p key={i}>{line}</p>)}</div>;
 })}</>;
}
export default function HumanMedicineLeaflet({text,profile,headings={}}:{text:string;profile?:LeafletProfile;headings?:Record<string,string>}) {
 const leaflet=parseReadableLeaflet(text,profile);
 const label=(key:string)=>headings[key]||key;
 return <div className="human-leaflet-content readable-leaflet">
  {leaflet.profile&&<section className="leaflet-product-facts" aria-label="Selected medicine composition">
   <h3>{label('Active Ingredients')} · {label('Strength')}</h3>
   <ul>{leaflet.profile.ingredients!.map(i=><li key={i.name}><strong>{i.name}:</strong> {i.strength}</li>)}</ul>
   <p>{[leaflet.profile.form,leaflet.profile.route,leaflet.profile.release].filter(Boolean).join(' · ')}</p>
  </section>}
  {leaflet.sections.map((s,i)=><section key={i}><h3>{label(s.key)}</h3><Body text={s.text}/></section>)}
  <section className="leaflet-price"><h3>Typical selling price</h3><p>{leaflet.price}</p></section>
  {(leaflet.sources.length>0||leaflet.notes.length>0)&&<details className="leaflet-sources"><summary>Sources and additional details</summary>
   {!!leaflet.sources.length&&<ol>{leaflet.sources.map((s,i)=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label||`Source ${i+1}`}</a></li>)}</ol>}
   {leaflet.notes.map((s,i)=><section key={i}><h4>{label(s.key)}</h4><Body text={s.text}/></section>)}
  </details>}
 </div>;
}
