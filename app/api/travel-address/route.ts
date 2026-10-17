import {NextResponse} from 'next/server';
import {travelPreviewEnabled} from '../../lib/travel-demo';
import {addressQuery,addressProviderUrl,addressSuggestions} from '../../lib/travel-address';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const configured=()=>process.env.MEDICEA_TRAVEL_ADDRESS_LOOKUP==='true'&&!!process.env.GEOAPIFY_API_KEY;
// Conservative per-instance backstop; provider-side quotas must also be configured.
let minute=0,minuteCount=0,hour=0,hourCount=0;
function budget(){const now=Date.now(),m=Math.floor(now/60000),h=Math.floor(now/3600000);if(m!==minute){minute=m;minuteCount=0;}if(h!==hour){hour=h;hourCount=0;}if(minuteCount>=60||hourCount>=500)return false;minuteCount++;hourCount++;return true;}
async function boundedText(body:ReadableStream<Uint8Array>|null,limit:number){
 if(!body)throw Error('body');const reader=body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('size');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
export async function GET(){
 if(!travelPreviewEnabled())return new NextResponse(null,{status:404});
 return NextResponse.json({available:configured()},{headers});
}
export async function POST(request:Request){
 if(!travelPreviewEnabled())return new NextResponse(null,{status:404});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({status:'forbidden'},{status:403,headers});
 if(!configured())return NextResponse.json({status:'disconnected',items:[]},{status:503,headers});
 let query;try{query=addressQuery(JSON.parse(await boundedText(request.body,2048)));}catch{}
 if(!query)return NextResponse.json({status:'invalid',items:[]},{status:400,headers});
 if(!budget())return NextResponse.json({status:'unavailable',items:[]},{status:429,headers:{...headers,'Retry-After':'60'}});
 try{
  // Forward only address text, destination and language. Never log inputs, keys or results.
  const response=await fetch(addressProviderUrl(query,process.env.GEOAPIFY_API_KEY!),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('provider');
  const items=addressSuggestions(JSON.parse(await boundedText(response.body,100000)),query.country);
  return NextResponse.json({status:'ok',items},{headers});
 }catch{return NextResponse.json({status:'unavailable',items:[]},{status:503,headers});}
}
