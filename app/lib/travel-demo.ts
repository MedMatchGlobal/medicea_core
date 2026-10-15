export const TRAVEL_DEMO_KEY='medicea.travel-demo.v1';
export const DEMO_COUNTRIES=['GB','IT'] as const;
export type DemoCountry=typeof DEMO_COUNTRIES[number];
export type DemoMedicine='A'|'B';
export type DemoTrip={id:string;home:DemoCountry;destination:DemoCountry;start:string;end:string;medicines:DemoMedicine[];checks:string[];savedAt:string};
export type DemoState={version:1;trips:DemoTrip[];home:DemoCountry;here:string;autoCountry:boolean};
export const CHECKS=['supply','expiry','storage','documents','review'] as const;
export function travelPreviewEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feature/travel-pack-preview'||!process.env.VERCEL_ENV&&process.env.NODE_ENV==='development'&&process.env.MEDICEA_TRAVEL_DEMO==='true';}
const country=(value:unknown):value is DemoCountry=>value==='GB'||value==='IT';
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validTrip(value:unknown):value is DemoTrip{
 if(!value||typeof value!=='object')return false;const t=value as DemoTrip;
 return typeof t.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(t.id)&&country(t.home)&&country(t.destination)&&date(t.start)&&date(t.end)&&t.end>=t.start&&Array.isArray(t.medicines)&&t.medicines.length>0&&t.medicines.length<=2&&t.medicines.every(m=>m==='A'||m==='B')&&new Set(t.medicines).size===t.medicines.length&&Array.isArray(t.checks)&&t.checks.length<=CHECKS.length&&t.checks.every(c=>CHECKS.includes(c as any))&&typeof t.savedAt==='string'&&Number.isFinite(Date.parse(t.savedAt));
}
export function readTravelDemo(raw:string|null):DemoState{
 const empty:DemoState={version:1,trips:[],home:'GB',here:'',autoCountry:false};
 try{const value=JSON.parse(raw||'null');if(value?.version!==1)return empty;return {version:1,home:country(value.home)?value.home:'GB',here:typeof value.here==='string'&&/^[A-Z]{2}$/.test(value.here)?value.here:'',autoCountry:value.autoCountry===true,trips:Array.isArray(value.trips)?value.trips.slice(0,10).filter(validTrip).map((t:DemoTrip)=>({id:t.id,home:t.home,destination:t.destination,start:t.start,end:t.end,medicines:t.medicines,checks:[...new Set(t.checks)],savedAt:t.savedAt})):[]};}catch{return empty;}
}
export function countryName(code:string,lang:string){try{return new Intl.DisplayNames([lang],{type:'region'}).of(code)||code;}catch{return code;}}
type Point=number[];
function insideRing(point:Point,ring:Point[]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function insidePolygon(point:Point,rings:Point[][]){return rings.length>0&&insideRing(point,rings[0])&&!rings.slice(1).some(r=>insideRing(point,r));}
export function locateCountry(latitude:number,longitude:number,features:any[]):string|null{
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180)return null;
 for(const feature of features){const shape=feature.geometry;const polygons=shape?.type==='Polygon'?[shape.coordinates]:shape?.type==='MultiPolygon'?shape.coordinates:[];if(polygons.some((p:Point[][])=>insidePolygon([longitude,latitude],p)))return /^[A-Z]{2}$/.test(feature.code)?feature.code:null;}return null;
}
export const OFFICIAL_HEALTH_SOURCES={GB:[{name:'MHRA',url:'https://www.gov.uk/drug-device-alerts'},{name:'UKHSA',url:'https://www.gov.uk/government/organisations/uk-health-security-agency'}],IT:[{name:'AIFA',url:'https://www.aifa.gov.it/'},{name:'Ministero della Salute',url:'https://www.salute.gov.it/'}]};
export function escapeTravelHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function offlineTripHtml(trip:DemoTrip,lang:string,c:Record<string,string>,cardLang=lang,cardCopy=c){
 if(!validTrip(trip))throw Error('Invalid demo trip');const e=escapeTravelHtml;
 const rows=trip.medicines.map(id=>`<tr><td>${e(cardCopy.medicine+' '+id)}</td><td>${e(cardCopy.ingredient+' '+id)}</td><td>${id==='A'?'10':'50'} mg</td><td>${e(cardCopy.tablet)}</td><td>${e(cardCopy.equivalent+' '+id)}</td></tr>`).join('');
 return `<!doctype html><html lang="${e(lang)}" dir="${['ar','he'].includes(lang)?'rtl':'ltr'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>medicéa · ${e(c.tripPack)}</title><style>body{font:17px/1.6 system-ui,sans-serif;max-width:850px;margin:auto;padding:24px;color:#163647;background:#f5f9fc}b.brand{color:#168d9a;font-size:30px}.notice{background:#fff0d9;border:1px solid #e4c58e;padding:16px;border-radius:12px}table{border-collapse:collapse;width:100%;background:white}td,th{padding:10px;border:1px solid #ccdce3;text-align:start}section{margin-top:24px}@media(max-width:600px){table{font-size:13px}td,th{padding:5px}}@media print{body{background:white;padding:0}}</style><body><b class="brand">medicéa</b><h1>${e(c.tripPack)}</h1><p class="notice">${e(c.demoNotice)}</p><p>${e(countryName(trip.home,lang))} → ${e(countryName(trip.destination,lang))}<br>${e(trip.start)} — ${e(trip.end)}</p><section lang="${e(cardLang)}" dir="${['ar','he'].includes(cardLang)?'rtl':'ltr'}"><h2>${e(cardCopy.pharmacistCard)}</h2><p>${e(cardCopy.cardMessage)}</p><table><thead><tr>${[cardCopy.medicines,cardCopy.ingredients,cardCopy.strength,cardCopy.form,cardCopy.equivalents].map(t=>`<th>${e(t)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></section><section><h2>${e(c.checklist)}</h2><ul>${CHECKS.map(key=>`<li>${trip.checks.includes(key)?'☑':'☐'} ${e(c[key])}</li>`).join('')}</ul></section><p>${e(c.offlineNote)}</p><p>${e(c.saved)}: ${e(trip.savedAt.slice(0,10))}</p></body></html>`;
}
