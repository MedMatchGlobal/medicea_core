import {NextResponse} from 'next/server';
import {travelPreviewEnabled} from '../../lib/travel-demo';
import {parseHealthNotices,UK_HEALTH_FEED} from '../../lib/travel-news';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!travelPreviewEnabled())return new NextResponse(null,{status:404});
 const country=new URL(request.url).searchParams.get('country');
 if(country!=='GB')return NextResponse.json({status:'unsupported',items:[]},{headers:{'Cache-Control':'no-store'}});
 try{
  // Only this fixed public source can be requested. No client URL, location or profile is forwarded.
  const response=await fetch(UK_HEALTH_FEED,{redirect:'error',signal:AbortSignal.timeout(8000),next:{revalidate:600},headers:{Accept:'application/atom+xml'}});
  if(!response.ok||Number(response.headers.get('content-length')||0)>500000||!response.body)throw Error('Feed unavailable');
  const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000)throw Error('Feed too large');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const items=await parseHealthNotices(new TextDecoder().decode(bytes));
  return NextResponse.json({status:'ok',items},{headers:{'Cache-Control':'private, max-age=60'}});
 }catch{return NextResponse.json({status:'unavailable',items:[]},{status:503,headers:{'Cache-Control':'no-store'}});}
}
