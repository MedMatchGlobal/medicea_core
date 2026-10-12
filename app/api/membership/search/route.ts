import {meteredSearch} from '@/lib/membership/meter';
// Preview integration probe: the existing medicine handler and prompts are unchanged.
// This endpoint is not yet wired into the public discovery UI.
export async function POST(req: Request) {
 return meteredSearch(req,async request=>{
  const body=await request.json();
  if(typeof body.drugName!=='string'||!body.drugName.trim()||typeof body.originCountry!=='string'||!body.originCountry.trim()||typeof body.targetCountry!=='string'||!body.targetCountry.trim())return Response.json({error:'INVALID_INPUT'},{status:400});
  const {POST}=await import('@/app/api/openai/equivalent-search/route');
  return POST(new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 });
}
