import {meteredSearch} from '@/lib/membership/meter';
import {readVariant} from '@/app/lib/origin-variants';
import {leafletIdentity} from '@/app/lib/leaflet-identity';
import {progressiveSearch} from '@/lib/membership/progressive-search';
import {claudePreviewEnabled} from '@/app/lib/claude-preview';
// The existing leaflet and matching handlers run sequentially inside one operation.
export const maxDuration = 180;
// One reservation for a normal medicine search, including its origin leaflet.
export async function POST(req: Request) {
 const previewInput=claudePreviewEnabled()?await req.clone().json().catch(()=>null):null;
 if(previewInput?.mode==='international'&&previewInput.stream===true){
  return progressiveSearch(req,(request,emit)=>{
   let pendingLeaflet:Promise<unknown>=Promise.resolve();
   const result=(async()=>{
    const body=await request.json();
    const selected=body.originSelection?readVariant(body.originSelection,body.drugName,body.originCountry,body.drugDosage||''):null;
    // Verify selected identity before starting either provider operation.
    if(!selected)return Response.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422});
    const providerRequest=(data:unknown)=>new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json',...(request.headers.get('x-medicea-equivalent-debug')==='1'?{'x-medicea-equivalent-debug':'1'}:{})},body:JSON.stringify(data),signal:request.signal});
    const {POST:leaflet}=await import('@/app/api/openai/leaflet/route');
    pendingLeaflet=leaflet(providerRequest({...body,drugName:selected.name,drugDosage:selected.ingredients.map(i=>i.strength).join(' + '),selectedProduct:leafletIdentity(selected,selected.name,body.originCountry)}))
     .then(async response=>emit({type:'leaflet',status:response.status,data:await response.json()}))
     .catch(()=>emit({type:'leaflet',status:503,data:{error:'LEAFLET_UNAVAILABLE'}}));
    const {POST:matches}=await import('@/app/api/openai/equivalent-search/route');
    return matches(providerRequest(body));
   })();
   // The tail keeps the function alive whichever branch finishes first.
   return {result,completed:result.then(()=>pendingLeaflet,()=>pendingLeaflet)};
  });
 }
 return meteredSearch(req,async request=>{
  const body=await request.json();
  const mode=body.mode||'international';
  if(!['international','generic','pets','pet-generic'].includes(mode))return Response.json({error:'INVALID_INPUT'},{status:400});
  if(typeof body.drugName!=='string'||!body.drugName.trim()||typeof body.originCountry!=='string'||!body.originCountry.trim()||
   ((mode==='international'||mode==='pets')&&(typeof body.targetCountry!=='string'||!body.targetCountry.trim())))return Response.json({error:'INVALID_INPUT'},{status:400});
  const providerRequest=()=>new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.VERCEL_ENV==='preview'&&request.headers.get('x-medicea-equivalent-debug')==='1'?{'x-medicea-equivalent-debug':'1'}:{})},body:JSON.stringify(body)});
  let originLeaflet;
  const selected=mode==='international'&&body.originSelection?readVariant(body.originSelection,body.drugName,body.originCountry,body.drugDosage||''):null;
  if(body.originSelection&&!selected)return Response.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422});
  if(mode==='international'||mode==='generic') {
   const {POST}=await import('@/app/api/openai/leaflet/route');
   const leaflet=await POST(selected?new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,drugName:selected.name,drugDosage:selected.ingredients.map(i=>i.strength).join(' + '),selectedProduct:leafletIdentity(selected,selected.name,body.originCountry)})}):providerRequest());
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
