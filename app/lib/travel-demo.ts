export const TRAVEL_DEMO_KEY='medicea.travel-demo.v1';
export const DEMO_COUNTRIES=['GB','IT','FR','ES','DE','PT','US','AU'] as const;
export type DemoCountry=typeof DEMO_COUNTRIES[number];
export type DemoMedicine=string;
export type TravelProduct={name:string;query:string;dosage:string;form:string;route:string;ingredients:{name:string;strength:string}[];sources:string[];lookup?:'original';identification?:'origin-v1';release?:string;excipients?:string[];excipientStatus?:'complete'|'partial'|'unknown'};
export type LibraryMedicine={id:DemoMedicine;origin:DemoCountry;product?:TravelProduct};
export type DemoComparison={medicine:DemoMedicine;origin:DemoCountry;destination:DemoCountry;checkedAt:string;previousChecks?:string[];matches?:{medicine_name:string;sources?:string[]}[];verification?:string};
export type DemoConsularContact={passport:DemoCountry;name:string;phone:string;address:string;savedAt:string};
export type DemoStay={address:string;start:string;end:string};
export type DemoTrip={id:string;home:DemoCountry;destination:DemoCountry;start:string;end:string;medicines:DemoMedicine[];checks:string[];savedAt:string;origins?:Partial<Record<DemoMedicine,DemoCountry>>;comparisons?:DemoComparison[];address?:string;stays?:DemoStay[];packId?:string;consular?:DemoConsularContact;passport?:DemoCountry;kind?:'connected';products?:Record<string,TravelProduct>};
export type DemoDestinationPack=Omit<DemoTrip,'start'|'end'|'checks'|'address'|'stays'|'packId'|'consular'|'passport'>;
export type DemoState={version:1;kind?:'connected';trips:DemoTrip[];packs:DemoDestinationPack[];home:DemoCountry;here:string;autoCountry:boolean;homeConfirmed:boolean;library:LibraryMedicine[];comparisons:DemoComparison[];otherCountry:string};
export const CHECKS=['supply','expiry','storage','documents','review'] as const;
export function travelPreviewEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feature/travel-pack-preview'||!process.env.VERCEL_ENV&&process.env.NODE_ENV==='development'&&process.env.MEDICEA_TRAVEL_DEMO==='true';}
const country=(value:unknown):value is DemoCountry=>typeof value==='string'&&(DEMO_COUNTRIES as readonly string[]).includes(value);
const medicine=(value:unknown):value is DemoMedicine=>value==='A'||value==='B';
const validComparison=(v:any):v is DemoComparison=>!!v&&medicine(v.medicine)&&country(v.origin)&&country(v.destination)&&typeof v.checkedAt==='string'&&Number.isFinite(Date.parse(v.checkedAt));
function comparisons(value:unknown):DemoComparison[]{const result:DemoComparison[]=[];if(Array.isArray(value))for(const v of value.slice(0,30)){if(validComparison(v)&&!result.some(c=>c.medicine===v.medicine&&c.origin===v.origin&&c.destination===v.destination))result.push({medicine:v.medicine,origin:v.origin,destination:v.destination,checkedAt:v.checkedAt,...(Array.isArray(v.previousChecks)?{previousChecks:[...new Set(v.previousChecks.filter((d:unknown)=>typeof d==='string'&&Number.isFinite(Date.parse(d))&&Date.parse(d)<Date.parse(v.checkedAt)))].sort((a:any,b:any)=>Date.parse(b)-Date.parse(a)).slice(0,24) as string[]}:{})});}return result;}
export function suggestHomeRegion(locales:readonly string[]):DemoCountry|''{for(const locale of locales){const match=locale.match(/(?:-|_)([A-Z]{2})(?:$|-|_)/i);if(match&&country(match[1].toUpperCase()))return match[1].toUpperCase() as DemoCountry;}return '';}
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validTrip(value:unknown,allowed:readonly string[]=['A','B']):value is DemoTrip{
 if(!value||typeof value!=='object')return false;const t=value as DemoTrip;
 return typeof t.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(t.id)&&country(t.home)&&country(t.destination)&&date(t.start)&&date(t.end)&&t.end>=t.start&&Array.isArray(t.medicines)&&t.medicines.length>0&&t.medicines.length<=Math.min(20,allowed.length)&&t.medicines.every(m=>allowed.includes(m))&&new Set(t.medicines).size===t.medicines.length&&Array.isArray(t.checks)&&t.checks.length<=CHECKS.length&&t.checks.every(c=>CHECKS.includes(c as any))&&typeof t.savedAt==='string'&&Number.isFinite(Date.parse(t.savedAt));
}
export function cleanStayAddress(value:unknown){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,240):'';}
export function cleanTripStays(value:unknown,start:string,end:string):DemoStay[]|null{
 if(!Array.isArray(value)||value.length>10)return null;
 const stays:DemoStay[]=[];
 for(const raw of value){if(!raw||typeof raw!=='object')return null;const v=raw as DemoStay,address=cleanStayAddress(v.address);if(!address||!date(v.start)||!date(v.end)||v.start<start||v.end>end||v.end<v.start)return null;stays.push({address,start:v.start,end:v.end});}
 stays.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
 if(stays.some((stay,i)=>i>0&&stay.start<stays[i-1].end))return null;
 return stays;
}
export function tripStays(trip:DemoTrip):DemoStay[]{return cleanTripStays(trip.stays,trip.start,trip.end)|| (trip.address?[{address:trip.address,start:trip.start,end:trip.end}]:[]);}
export function cleanConsularContact(value:unknown):DemoConsularContact|null{
 if(!value||typeof value!=='object')return null;const v=value as DemoConsularContact;
 if(!country(v.passport)||!cleanStayAddress(v.name)||typeof v.phone!=='string'||!/^\+?[0-9][0-9 ().-]{2,39}$/.test(v.phone)||!cleanStayAddress(v.address)||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))return null;
 return {passport:v.passport,name:cleanStayAddress(v.name).slice(0,120),phone:v.phone,address:cleanStayAddress(v.address),savedAt:v.savedAt};
}
export const EMERGENCY_REFERENCE_DATE='2026-10-16';
const euEmergency={number:'112',source:'https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm'};
export const EMERGENCY_CONTACTS:Record<DemoCountry,{number:string;source:string}>={GB:{number:'999',source:'https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers'},IT:euEmergency,FR:euEmergency,ES:euEmergency,DE:euEmergency,PT:euEmergency,US:{number:'911',source:'https://www.911.gov/calling-911/'},AU:{number:'000',source:'https://www.infrastructure.gov.au/media-communications/phone/triple-zero'}};
export const CONSULAR_DIRECTORIES:Record<DemoCountry,string>={GB:'https://www.gov.uk/world/embassies',IT:'https://www.esteri.it/it/ministero/struttura/laretediplomatica/',FR:'https://www.diplomatie.gouv.fr/fr/le-ministere/reseau-diplomatique/ambassades',ES:'https://www.exteriores.gob.es/es/EmbajadasConsulados/Paginas/index.aspx',DE:'https://www.auswaertiges-amt.de/en/about-us/auslandsvertretungen',PT:'https://portaldascomunidades.mne.gov.pt/pt/rede-consular',US:'https://travel.state.gov/content/travel/en/find_us_embassies.html',AU:'https://www.dfat.gov.au/about-us/our-locations/missions/our-embassies-and-consulates-overseas'};
export function embassySearchUrl(passport:DemoCountry,address:string,destination:DemoCountry){
 if(!country(passport)||!country(destination)||passport===destination)return '';
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('embassy or consulate of '+countryName(passport,'en')+(cleanStayAddress(address)?' near '+cleanStayAddress(address)+', ':' in ')+countryName(destination,'en'));
}
export function validDestinationPack(value:unknown,allowed?:readonly string[]):value is DemoDestinationPack{
 // Reuse the fixed medicine/country validation without requiring journey dates.
 return !!value&&typeof value==='object'&&!('start' in value)&&!('end' in value)&&validTrip({...value,start:'2000-01-01',end:'2000-01-01',checks:[]},allowed);
}
export function makeDestinationPack(state:DemoState,id:string,destination:DemoCountry,ids:DemoMedicine[],now=new Date()):DemoDestinationPack{
 const selected=state.library.filter(m=>ids.includes(m.id));
 const pack:DemoDestinationPack={...(state.kind==='connected'?{kind:'connected' as const,products:Object.fromEntries(selected.filter(m=>m.product).map(m=>[m.id,JSON.parse(JSON.stringify(m.product))]))}:{}),id,home:state.home,destination,medicines:selected.map(m=>m.id),savedAt:now.toISOString(),origins:Object.fromEntries(selected.map(m=>[m.id,m.origin])),comparisons:state.comparisons.filter(r=>r.destination===destination&&selected.some(m=>m.id===r.medicine&&m.origin===r.origin)).map(r=>({...r,...(r.matches?{matches:r.matches.map(m=>({...m,...(m.sources?{sources:[...m.sources]}:{})}))}:{}),...(r.previousChecks?{previousChecks:[...r.previousChecks]}:{})}))};
 if(!validDestinationPack(pack,state.kind==='connected'?Object.keys(pack.products||{}):undefined))throw Error('Invalid destination pack');return pack;
}
export function prepareDestinationTrip(pack:DemoDestinationPack,id:string,start:string,end:string,address:string,now=new Date(),stays?:DemoStay[]):DemoTrip{
 const trip:DemoTrip={...pack,...(pack.products?{products:JSON.parse(JSON.stringify(pack.products))}:{}),id,packId:pack.id,start,end,address:cleanStayAddress(address),checks:[],savedAt:now.toISOString(),medicines:[...pack.medicines],origins:{...pack.origins},comparisons:(pack.comparisons||[]).map(r=>({...r,...(r.matches?{matches:r.matches.map(m=>({...m,...(m.sources?{sources:[...m.sources]}:{})}))}:{}),...(r.previousChecks?{previousChecks:[...r.previousChecks]}:{})}))};
 if(stays!==undefined){const cleaned=cleanTripStays(stays,start,end);if(!cleaned)throw Error('Invalid stays');trip.stays=cleaned;trip.address=cleaned[0]?.address||'';}
 if(!validTrip(trip,pack.kind==='connected'?Object.keys(pack.products||{}):undefined))throw Error('Invalid trip');return trip;
}
export function nearbyCareUrl(kind:'pharmacy'|'gp'|'hospital',address:string,destination:DemoCountry){
 const place=cleanStayAddress(address);if(!place||!country(destination))return '';
 const term={pharmacy:'pharmacy',gp:'general practitioner',hospital:'hospital'}[kind];if(!term)return '';
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(term+' near '+place+', '+countryName(destination,'en'));
}
export function readTravelDemo(raw:string|null):DemoState{
 const empty:DemoState={version:1,trips:[],packs:[],home:'GB',here:'',autoCountry:false,homeConfirmed:false,library:[],comparisons:[],otherCountry:'IT'};
 try{
  const value=JSON.parse(raw||'null');if(value?.version!==1)return empty;
  const trips:DemoTrip[]=Array.isArray(value.trips)?value.trips.slice(0,10).filter((t:unknown)=>validTrip(t)).map((t:DemoTrip)=>({id:t.id,home:t.home,destination:t.destination,start:t.start,end:t.end,medicines:t.medicines,checks:[...new Set(t.checks)],savedAt:t.savedAt,...(country(t.passport)?{passport:t.passport}:{}),...(cleanConsularContact(t.consular)?{consular:cleanConsularContact(t.consular)!}:{}),...(cleanStayAddress(t.address)?{address:cleanStayAddress(t.address)}:{}),...(Array.isArray(t.stays)&&cleanTripStays(t.stays,t.start,t.end)?{stays:cleanTripStays(t.stays,t.start,t.end)!}:{}),...(typeof t.packId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(t.packId)?{packId:t.packId}:{}),...(t.origins&&typeof t.origins==='object'?{origins:Object.fromEntries(t.medicines.map(id=>[id,country(t.origins?.[id])?t.origins![id]:t.home])),comparisons:comparisons(t.comparisons).filter(c=>t.medicines.includes(c.medicine)&&c.destination===t.destination&&c.origin===(t.origins?.[c.medicine]||t.home))}:{})})):[];
  const packs:DemoDestinationPack[]=[];
  const incoming=Array.isArray(value.packs)?value.packs:trips.map(t=>({id:'destination-'+t.destination,home:t.home,destination:t.destination,medicines:t.medicines,savedAt:t.savedAt,origins:t.origins,comparisons:t.comparisons}));
  for(const p of incoming.slice(0,10))if(validDestinationPack(p)&&!packs.some(item=>item.destination===p.destination))packs.push({id:p.id,home:p.home,destination:p.destination,medicines:[...p.medicines],savedAt:p.savedAt,origins:Object.fromEntries(p.medicines.map(id=>[id,country(p.origins?.[id])?p.origins![id]:p.home])),comparisons:comparisons(p.comparisons).filter(c=>p.medicines.includes(c.medicine)&&c.destination===p.destination&&c.origin===(p.origins?.[c.medicine]||p.home))});
  const library:LibraryMedicine[]=[];
  if(Array.isArray(value.library)){for(const item of value.library.slice(0,10))if(item&&medicine(item.id)&&country(item.origin)&&!library.some(m=>m.id===item.id))library.push({id:item.id,origin:item.origin});}
  else for(const trip of trips)for(const id of trip.medicines)if(!library.some(m=>m.id===id))library.push({id,origin:trip.origins?.[id]||trip.home});
  return {version:1,trips,packs,library,comparisons:comparisons(value.comparisons).filter(c=>library.some(m=>m.id===c.medicine&&m.origin===c.origin)),home:country(value.home)?value.home:'GB',homeConfirmed:value.homeConfirmed===true,here:typeof value.here==='string'&&/^[A-Z]{2}$/.test(value.here)?value.here:'',autoCountry:value.autoCountry===true,otherCountry:typeof value.otherCountry==='string'&&/^[A-Z]{2}$/.test(value.otherCountry)?value.otherCountry:empty.otherCountry};
 }catch{return empty;}
}
export function saveDemoComparisons(state:DemoState,items:DemoComparison[]):DemoState{
 const valid=comparisons(items).filter(c=>state.library.some(m=>m.id===c.medicine&&m.origin===c.origin)).map(c=>{
  const old=state.comparisons.find(v=>v.medicine===c.medicine&&v.origin===c.origin&&v.destination===c.destination);
  if(old&&Date.parse(c.checkedAt)<=Date.parse(old.checkedAt))return old;
  return old?{...c,previousChecks:[...new Set([old.checkedAt,...(old.previousChecks||[])])].slice(0,24)}:c;
 });
 return {...state,comparisons:[...valid,...state.comparisons.filter(c=>!valid.some(v=>v.medicine===c.medicine&&v.origin===c.origin&&v.destination===c.destination))]};
}
export function comparisonReviewDate(checkedAt:string){
 const d=new Date(checkedAt);if(!Number.isFinite(d.getTime()))return '';
 const year=d.getUTCFullYear()+1,month=d.getUTCMonth(),day=d.getUTCDate();
 return new Date(Date.UTC(year,month,Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()))).toISOString().slice(0,10);
}
export function comparisonReviewDue(checkedAt:string,now=new Date()){
 const review=comparisonReviewDate(checkedAt);return !review||now.toISOString().slice(0,10)>=review;
}
export function countryName(code:string,lang:string){try{return new Intl.DisplayNames([lang],{type:'region'}).of(code)||code;}catch{return code;}}
type Point=number[];
function insideRing(point:Point,ring:Point[]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function insidePolygon(point:Point,rings:Point[][]){return rings.length>0&&insideRing(point,rings[0])&&!rings.slice(1).some(r=>insideRing(point,r));}
export function locateCountry(latitude:number,longitude:number,features:any[]):string|null{
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180)return null;
 for(const feature of features){const shape=feature.geometry;const polygons=shape?.type==='Polygon'?[shape.coordinates]:shape?.type==='MultiPolygon'?shape.coordinates:[];if(polygons.some((p:Point[][])=>insidePolygon([longitude,latitude],p)))return /^[A-Z]{2}$/.test(feature.code)?feature.code:null;}return null;
}
export const OFFICIAL_HEALTH_SOURCES:Partial<Record<DemoCountry,{name:string;url:string}[]>>={GB:[{name:'MHRA',url:'https://www.gov.uk/drug-device-alerts'},{name:'UKHSA',url:'https://www.gov.uk/government/organisations/uk-health-security-agency'}],IT:[{name:'AIFA',url:'https://www.aifa.gov.it/'},{name:'Ministero della Salute',url:'https://www.salute.gov.it/'}]};
export function escapeTravelHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function travelMedicine(record:{products?:Record<string,TravelProduct>},id:string,c:Record<string,string>){
 const p=record.products?.[id];return p?{name:p.name,ingredients:p.ingredients.map(i=>i.name).join(' + '),strength:p.ingredients.map(i=>i.name+' '+i.strength).join(' + '),form:p.form,sources:p.sources}:{name:c.medicine+' '+id,ingredients:c.ingredient+' '+id,strength:(id==='A'?'10':'50')+' mg',form:c.tablet,sources:[] as string[]};
}
export function offlineTripHtml(trip:DemoTrip|DemoDestinationPack,lang:string,c:Record<string,string>,cardLang=lang,cardCopy=c){
 const allowed=trip.kind==='connected'?Object.keys(trip.products||{}):undefined,isTrip=validTrip(trip,allowed);
 if(!isTrip&&!validDestinationPack(trip,allowed))throw Error('Invalid demo trip');const e=escapeTravelHtml;
 const rows=trip.medicines.map(id=>{
  const product=travelMedicine(trip,id,cardCopy);
  const comparison=trip.comparisons?.find(result=>result.medicine===id);
  const equivalent=trip.kind==='connected'?(comparison?(comparison.matches?.map(m=>m.medicine_name).join('; ')||cardCopy.noMatchLabel||'—'):cardCopy.notComparedLabel||'—'):!trip.origins||comparison?cardCopy.equivalent+' '+id:cardCopy.notComparedLabel||cardCopy.equivalents;
  const fields=[[cardCopy.originCountryLabel||cardCopy.home,countryName(trip.origins?.[id]||trip.home,cardLang)],[cardCopy.ingredients,product.ingredients],[cardCopy.strength,product.strength],[cardCopy.form,product.form]];
  return `<article class="medicine-card"><h3>${e(product.name)}</h3><dl>${fields.map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><div class="comparison"><h4>${e(cardCopy.equivalents)}</h4><p>${e(equivalent)}</p>${comparison?`<p class="caption">${e(cardCopy.checkedLabel||cardCopy.saved)}: ${e(comparison.checkedAt.slice(0,10))}</p>`:''}</div></article>`;
 }).join('');
 return `<!doctype html><html lang="${e(lang)}" dir="${['ar','he'].includes(lang)?'rtl':'ltr'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>medicéa · ${e(c.tripPack)}</title><style>
 *{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;max-width:850px;margin:auto;padding:24px;color:#173849;background:#f5f8fc;overflow-wrap:anywhere}b.brand{color:#168d9a;font-size:27px}h1{font-size:28px;line-height:1.2;margin:16px 0}h2{font-size:22px;line-height:1.3}h3{font-size:19px;margin:0 0 14px}h4{font-size:13px;font-weight:500;color:#365b6c;margin:0 0 6px}.notice{background:#fff4df;border:1px solid #e4cda0;padding:14px 16px;border-radius:14px;font-size:14px}.trip-summary{border-bottom:1px solid #d7e6e9;padding-bottom:18px}.trip-summary span{display:block;color:#4c6d7d;font-size:14px;margin-top:5px}section{margin-top:24px}.medicine-card{padding:20px;background:white;border:1px solid #d6e2e8;border-radius:16px;margin:16px 0;break-inside:avoid}dl{margin:0}dl div{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:14px;padding:10px 0;border-top:1px solid #e0e9ee}dt{color:#4c6d7d;font-size:14px}dd{margin:0;font-weight:600;min-width:0}.comparison{margin-top:14px;padding:14px;border-radius:10px;background:#edf7f6;border-inline-start:3px solid #4b9b99}.comparison p{margin:0}.comparison .caption{margin-top:8px}.caption{font-size:13px;color:#4c6d7d}.checklist{background:white;border:1px solid #d6e2e8;border-radius:16px;padding:18px 22px}.checklist h2{margin-top:0}.checklist ul{list-style:none;padding:0;margin:0}.checklist li{padding:9px 0;border-top:1px solid #e0e9ee}footer{margin-top:24px;border-top:1px solid #d7e6e9;padding-top:14px}@media(max-width:600px){body{padding:16px}h1{font-size:25px}h2{font-size:21px}.medicine-card{padding:16px}dl div{gap:12px}}@media print{body{background:white;padding:0;font-size:11pt}h1{font-size:21pt}h2{font-size:16pt}.medicine-card{box-shadow:none}.notice{background:white}.caption{font-size:10pt}}
 </style><body><b class="brand">medicéa</b><h1>${e(c.tripPack)}</h1><p class="trip-summary"><strong>${e(countryName(trip.home,lang))} → ${e(countryName(trip.destination,lang))}</strong>${isTrip?`<span>${e(trip.start)} — ${e(trip.end)}</span>`:''}</p><p class="notice">${e(c.demoNotice)}</p><section lang="${e(cardLang)}" dir="${['ar','he'].includes(cardLang)?'rtl':'ltr'}"><h2>${e(cardCopy.pharmacistCard)}</h2><p class="caption">${e(cardCopy.cardMessage)}</p>${rows}${trip.origins?`<p class="caption">${e(cardCopy.sourceLabel||cardCopy.cardMessage)}</p>`:''}</section>${isTrip&&tripStays(trip).length?`<section><h2>${e(c.staysLabel||c.addressLabel||'Addresses')}</h2>${tripStays(trip).map(stay=>`<article><p><strong>${e(stay.address)}</strong></p><p>${e(stay.start)} — ${e(stay.end)}</p></article>`).join('')}<p class="caption">${e(c.careNote||'')}</p></section>`:''}${isTrip?`<section class="checklist"><h2>${e(c.checklist)}</h2><ul>${CHECKS.map(key=>`<li>${trip.checks.includes(key)?'☑':'☐'} ${e(c[key])}</li>`).join('')}</ul></section>`:''}<section><h2>${e(c.emergencyLabel||'Emergency services')}</h2><p><strong>${e(EMERGENCY_CONTACTS[trip.destination].number)}</strong> · ${e(countryName(trip.destination,lang))}</p><p class="caption">${e(c.checkedLabel||c.saved)}: ${EMERGENCY_REFERENCE_DATE}</p></section>${isTrip&&trip.consular?`<section><h2>${e(c.embassyLabel||'Embassy / consulate')} · ${e(countryName(trip.consular.passport,lang))}</h2><p><strong>${e(trip.consular.name)}</strong></p><p>${e(trip.consular.phone)}</p><p>${e(trip.consular.address)}</p><p class="caption">${e(c.contactNote||'Saved by you; not independently verified.')}</p></section>`:''}<footer class="caption"><p>${e(c.offlineNote)}</p><p>${e(c.saved)}: ${e(trip.savedAt.slice(0,10))}</p></footer></body></html>`;
}
