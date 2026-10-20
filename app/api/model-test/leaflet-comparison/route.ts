import {travelSolEnabled} from '@/app/lib/openaiClient';
import {LEAFLET_COMPARISON_ARMS,runLeafletComparison,type LeafletComparisonArm} from '@/app/lib/leaflet-comparison';
export const maxDuration=60;
let windowStarted=0,requests=0,active=0;
export async function POST(request:Request){
 if(!travelSolEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'INVALID_ORIGIN'},{status:403});
 let body:any;try{body=await request.json();}catch{return Response.json({error:'INVALID_INPUT'},{status:400});}
 if(!body||Object.keys(body).length!==1||!LEAFLET_COMPARISON_ARMS.includes(body.arm))return Response.json({error:'INVALID_INPUT'},{status:400});
 if(Date.now()-windowStarted>600000){windowStarted=Date.now();requests=0;}
 if(active>=2||requests>=8)return Response.json({error:'COMPARISON_LIMIT'},{status:429});
 requests++;active++;
 try{return Response.json(await runLeafletComparison(body.arm as LeafletComparisonArm),{headers:{'Cache-Control':'no-store'}});}finally{active--;}
}
