import {meteredSearch} from '@/lib/membership/meter';
// The existing leaflet and matching handlers run sequentially inside one operation.
export const maxDuration = 120;
// One reservation for a normal medicine search, including its origin leaflet.
export async function POST(req: Request) {
 return meteredSearch(req,async request=>{
  const body=await request.json();
  const mode=body.mode||'international';
  if(!['international','generic','pets','pet-generic'].includes(mode))return Response.json({error:'INVALID_INPUT'},{status:400});
  if(typeof body.drugName!=='string'||!body.drugName.trim()||typeof body.originCountry!=='string'||!body.originCountry.trim()||
   ((mode==='international'||mode==='pets')&&(typeof body.targetCountry!=='string'||!body.targetCountry.trim())))return Response.json({error:'INVALID_INPUT'},{status:400});
  const providerRequest=()=>new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let originLeaflet;
  if(mode==='international'||mode==='generic') {
   const {POST}=await import('@/app/api/openai/leaflet/route');
   const leaflet=await POST(providerRequest());
   if(!leaflet.ok)return leaflet;
   originLeaflet=await leaflet.json();
  }
  const handler=mode==='international'?await import('@/app/api/openai/equivalent-search/route'):
   mode==='generic'?await import('@/app/api/openai/generics/route'):
   mode==='pet-generic'?await import('@/app/api/openai/pet-generics/route'):await import('@/app/api/openai/pets/route');
  const result=await handler.POST(providerRequest());
  if(!result.ok)return result;
  const payload=await result.json();
  return Response.json({...payload,originLeaflet});
 });
}
