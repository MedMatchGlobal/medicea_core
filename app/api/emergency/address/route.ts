import {NextResponse} from 'next/server';
export const runtime='nodejs';
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
// No location persistence. Restrict the key to Geocoding and set a provider quota.
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'INVALID_ORIGIN'},403);
 const key=process.env.SOS_GEOCODING_API_KEY;
 if(!key)return reply({address:null},200);
 try{
  const raw=await req.text();if(raw.length>256)return reply({error:'INVALID_LOCATION'},400);
  const {latitude,longitude}=JSON.parse(raw);
  if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return reply({error:'INVALID_LOCATION'},400);
  const params=new URLSearchParams({latlng:`${latitude},${longitude}`,key,result_type:'street_address|route'});
  const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`,{cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!response.ok)return reply({address:null});
  const data=await response.json();
  const address=data.status==='OK'?data.results?.[0]?.formatted_address:null;
  return reply({address:typeof address==='string'?address.slice(0,500):null});
 }catch{return reply({address:null});}
}
