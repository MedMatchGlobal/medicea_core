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
  if(mode==='international'||mode==='generic'){
   const {modelUpgradeEnabled,modelTestConfiguration}=await import('@/app/lib/openaiClient');
   if(modelUpgradeEnabled?.()&&modelTestConfiguration?.().matchingMode==='prompt-test'){
    const handler=mode==='international'?await import('@/app/api/openai/equivalent-search/route'):await import('@/app/api/openai/generics/route');
    const result=await handler.POST(providerRequest());if(!result.ok)return result;
    const payload=await result.json();const profile=payload.originProfile;
    let originLeaflet;
    if(profile?.selection_token){
     const {POST}=await import('@/app/api/openai/leaflet/route');
     const summary=await POST(new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,drugName:profile.medicine_name,originQueryName:body.drugName,originSelection:profile.selection_token})}));
     if(summary.ok)originLeaflet=await summary.json();
    }
    return Response.json({...payload,originLeaflet});
   }
  }
  let originLeaflet;
  let summaryName=body.drugName;
  if(body.originSelection&&(mode==='international'||mode==='generic')){
   const {modelUpgradeEnabled}=await import('@/app/lib/openaiClient');
   if(modelUpgradeEnabled()){
    const {readOriginSelection}=await import('@/app/lib/origin-lookup');
    const selected=readOriginSelection(body.originSelection,body.drugName,body.originCountry,body.drugDosage);
    if(!selected)return Response.json({error:'ORIGIN_SELECTION_EXPIRED'},{status:422});
    summaryName=selected.name;
   }
  }
  if(mode==='international'||mode==='generic') {
   const {POST}=await import('@/app/api/openai/leaflet/route');
   const leaflet=await POST(new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,drugName:summaryName,originQueryName:body.drugName})}));
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
