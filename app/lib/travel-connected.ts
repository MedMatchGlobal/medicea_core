import {readTravelDemo,DEMO_COUNTRIES,validTrip,validDestinationPack,cleanTripStays,cleanStayAddress,cleanConsularContact,type DemoState,type DemoTrip,type DemoDestinationPack,type DemoComparison,type TravelProduct} from './travel-demo';
import {isMedicineName} from './match-display';
import {medicineSources} from './medicine-evidence';
export const CONNECTED_TRAVEL_KEY='medicea.travel-connected.test.v1';
export function connectedTravelEnabled(){return process.env.MEDICEA_TRAVEL_CONNECTED==='true'&&(process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feature/travel-pack-preview'||!process.env.VERCEL_ENV&&process.env.NODE_ENV==='development');}
const text=(v:unknown,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const country=(v:unknown)=>typeof v==='string'&&(DEMO_COUNTRIES as readonly string[]).includes(v);
const id=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v);
export function cleanTravelProduct(value:unknown):TravelProduct|null{
 if(!value||typeof value!=='object')return null;const v=value as TravelProduct;
 const ingredients=Array.isArray(v.ingredients)?v.ingredients.slice(0,20).map(i=>({name:text(i?.name,250),strength:text(i?.strength,250)})):[];
 const sources=medicineSources(v.sources);
 if(!isMedicineName(v.name)||!text(v.query,250)||!text(v.form,100)||!text(v.route,100)||/unknown|unspecified/i.test(v.form+' '+v.route)||!ingredients.length||ingredients.some(i=>!i.name||!i.strength||!/[0-9]/.test(i.strength))||!sources.length)return null;
 return {name:text(v.name,250),query:text(v.query,250),dosage:text(v.dosage,100),form:text(v.form,100),route:text(v.route,100),ingredients,sources};
}
export function sameTravelProduct(a:TravelProduct,b:TravelProduct){
 const actives=(p:TravelProduct)=>p.ingredients.map(i=>(i.name+'|'+i.strength).toLowerCase().replace(/\s+/g,'')).sort().join(';');
 return a.name.toLowerCase()===b.name.toLowerCase()&&a.form.toLowerCase()===b.form.toLowerCase()&&a.route.toLowerCase()===b.route.toLowerCase()&&actives(a)===actives(b);
}
export function cleanLiveComparison(value:unknown,allowed:Record<string,TravelProduct>,origins:Record<string,string>,destination?:string):DemoComparison|null{
 if(!value||typeof value!=='object')return null;const v=value as DemoComparison;
 if(!allowed[v.medicine]||v.origin!==origins[v.medicine]||!country(v.destination)||destination&&v.destination!==destination||!Number.isFinite(Date.parse(v.checkedAt))||!Array.isArray(v.matches)||!['model_generated_full_composition','source_cited_full_composition'].includes(v.verification||''))return null;
 const matches=v.matches.slice(0,10).map(m=>({medicine_name:text(m?.medicine_name,1000),sources:medicineSources(m?.sources)})).filter(m=>isMedicineName(m.medicine_name));
 if(v.matches.length&&!matches.length)return null;
 return {medicine:v.medicine,origin:v.origin,destination:v.destination,checkedAt:new Date(v.checkedAt).toISOString(),matches,verification:v.verification,...(Array.isArray(v.previousChecks)?{previousChecks:v.previousChecks.filter(d=>typeof d==='string'&&Number.isFinite(Date.parse(d))&&Date.parse(d)<Date.parse(v.checkedAt)).slice(0,24)}:{})};
}
export function readConnectedTravel(raw:string|null):DemoState{
 const empty={...readTravelDemo(null),kind:'connected' as const};
 try{
  const v=JSON.parse(raw||'null');if(v?.version!==1||v.kind!=='connected')return empty;
  const base=readTravelDemo(JSON.stringify({...v,trips:[],packs:[],library:[],comparisons:[]}));
  const library:DemoState['library']=[];
  for(const m of Array.isArray(v.library)?v.library.slice(0,20):[]){const product=cleanTravelProduct(m?.product);if(id(m?.id)&&country(m.origin)&&product&&!library.some(item=>item.id===m.id))library.push({id:m.id,origin:m.origin,product});}
  const products=Object.fromEntries(library.map(m=>[m.id,m.product!])),origins=Object.fromEntries(library.map(m=>[m.id,m.origin]));
  function results(input:unknown,p:Record<string,TravelProduct>,o:Record<string,string>,dest?:string){const result:DemoComparison[]=[];for(const item of Array.isArray(input)?input.slice(0,160):[]){const checked=cleanLiveComparison(item,p,o,dest);if(checked&&!result.some(r=>r.medicine===checked.medicine&&r.destination===checked.destination))result.push(checked);}return result;}
  function snapshot(item:any,trip:boolean):DemoTrip|DemoDestinationPack|null{
   if(!item||!id(item.id)||!country(item.home)||!country(item.destination)||!Array.isArray(item.medicines)||!item.products)return null;
   const p:Record<string,TravelProduct>={};for(const key of item.medicines.slice(0,20)){const product=cleanTravelProduct(item.products[key]);if(id(key)&&product)p[key]=product;}
   if(!(trip?validTrip(item,Object.keys(p)):validDestinationPack(item,Object.keys(p))))return null;
   const o:Record<string,string>=Object.fromEntries(item.medicines.map((key:string)=>[key,country(item.origins?.[key])?item.origins[key]:item.home]));
   const common:DemoDestinationPack={kind:'connected',id:item.id,home:item.home,destination:item.destination,medicines:[...item.medicines],savedAt:new Date(item.savedAt).toISOString(),products:p,origins:o as DemoTrip['origins'],comparisons:results(item.comparisons,p,o,item.destination)};
   if(!trip)return common;
   const stays=cleanTripStays(item.stays,item.start,item.end),contact=cleanConsularContact(item.consular);
   return {...common,start:item.start,end:item.end,checks:[...new Set(item.checks)] as string[],...(stays?{stays}:{}),...(cleanStayAddress(item.address)?{address:cleanStayAddress(item.address)}:{}),...(id(item.packId)?{packId:item.packId}:{}),...(country(item.passport)?{passport:item.passport}:{}),...(contact?{consular:contact}:{})};
  }
  const packs:DemoDestinationPack[]=[],trips:DemoTrip[]=[];
  for(const item of Array.isArray(v.packs)?v.packs.slice(0,8):[]){const p=snapshot(item,false);if(p&&!packs.some(q=>q.destination===p.destination))packs.push(p);}
  for(const item of Array.isArray(v.trips)?v.trips.slice(0,10):[]){const t=snapshot(item,true);if(t&&'start'in t&&!trips.some(q=>q.id===t.id))trips.push(t);}
  return {...base,kind:'connected',library,comparisons:results(v.comparisons,products,origins),packs,trips};
 }catch{return empty;}
}
