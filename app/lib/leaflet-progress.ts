import {REQUIRED_LEAFLET_TOPICS} from './leaflet-contract';
// One HTTP response, with validated core information before optional prices.
export function leafletProgress(run:(ready:(payload:unknown)=>void)=>Promise<Response>):Response{
 const encoder=new TextEncoder();let cancelled=false;
 const body=new ReadableStream({start(controller){
  const send=(type:string,payload:unknown)=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify({type,payload})+'\n'));};
  void run(payload=>send('ready',payload)).then(async response=>{
   send(response.ok?'complete':'error',{...await response.json(),serverTiming:response.headers.get('Server-Timing')});
  }).catch(()=>send('error',{error:'MEDICINE_INFORMATION_UNAVAILABLE'})).finally(()=>{if(!cancelled)controller.close();});
 },cancel(){cancelled=true;}});
 return new Response(body,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Accept'}});
}
export class LeafletReadError extends Error {
 public missingSections:string[];
 constructor(public diagnosticCode:string,missingSections?:unknown){super('Leaflet request failed');this.missingSections=Array.isArray(missingSections)?REQUIRED_LEAFLET_TOPICS.filter(key=>missingSections.includes(key)):[];}
}
function failureCode(payload:any){return typeof payload?.diagnosticCode==='string'&&/^[A-Z0-9_]{1,60}$/.test(payload.diagnosticCode)?payload.diagnosticCode:'LEAFLET_UNAVAILABLE';}
export async function readLeafletResponse(response:Response,onReady:(payload:any)=>void,pendingPriceLabel?:string):Promise<any>{
 if(!response.headers.get('Content-Type')?.startsWith('application/x-ndjson')){const payload=await response.json();if(!response.ok)throw new LeafletReadError(failureCode(payload),payload.missingSections);return payload;}
 if(!response.body)throw Error('EMPTY_LEAFLET_STREAM');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',final:any,complete=false;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line);if(event.type==='ready'){const p=event.payload;if(p?.pricePending&&pendingPriceLabel&&typeof p.leaflet?.leaflet_text==='string')onReady({...p,leaflet:{...p.leaflet,leaflet_text:p.leaflet.leaflet_text.replace(/Average Selling Price\n[\s\S]*$/,'Average Selling Price\n- '+pendingPriceLabel)}});else onReady(p);}else if(event.type==='complete'){final=event.payload;complete=true;}else if(event.type==='error')throw new LeafletReadError(failureCode(event.payload),event.payload?.missingSections);};
 try{while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let index;while((index=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}if(buffer.length>500_000)throw Error('LEAFLET_STREAM_TOO_LARGE');}buffer+=decoder.decode();consume(buffer);if(!complete)throw Error('INCOMPLETE_LEAFLET_STREAM');return final;}finally{reader.releaseLock();}
}
