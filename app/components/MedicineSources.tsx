import {medicineSources} from '../lib/medicine-evidence';
export default function MedicineSources({sources}:{sources:unknown}){
 const urls=medicineSources(sources);if(!urls.length)return null;
 return <div style={{display:'flex',gap:'6px 12px',flexWrap:'wrap',marginTop:8,fontSize:12}}>{urls.map((url,i)=><a key={url} href={url} title={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}{urls.length>1?` · ${i+1}`:''}</a>)}</div>;
}
