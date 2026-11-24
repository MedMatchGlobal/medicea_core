import {meteredSearch} from './meter';
type Progress={type:'leaflet';status:number;data:unknown};
type Work={result:Promise<Response>;completed:Promise<unknown>};
// One existing metered reservation. Only server-authorised work can emit data;
// matching is settled by meteredSearch before its final result/grant is emitted.
export function progressiveSearch(req:Request,run:(request:Request,emit:(event:Progress)=>void)=>Work):Response {
 let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({
  async start(controller){
   const encoder=new TextEncoder();
   const emit=(event:unknown)=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
   let completed:Promise<unknown>=Promise.resolve();
   try{
    const result=await meteredSearch(req,request=>{
     const work=run(request,emit);completed=work.completed.catch(()=>{});return work.result;
    });
    emit({type:'result',status:result.status,data:await result.json().catch(()=>({error:'SEARCH_UNAVAILABLE'}))});
   }catch{emit({type:'result',status:503,data:{error:'SEARCH_UNAVAILABLE'}});}
   finally{await completed;if(!cancelled)controller.close();}
  },cancel(){cancelled=true;},
 });
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
