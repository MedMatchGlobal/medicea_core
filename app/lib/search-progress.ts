type ProgressEvent={type:'leaflet'|'result';status:number;data:any};
// Decode UTF-8 and arbitrary network chunk boundaries without buffering the
// entire search. Callers own stale-selection checks and access-error handling.
export async function readSearchProgress(response:Response,onEvent:(event:ProgressEvent)=>void){
 if(!response.body)throw Error('Search stream unavailable');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result:ProgressEvent|undefined;
 function consume(line:string){if(!line.trim())return;const event=JSON.parse(line);if(!['leaflet','result'].includes(event.type)||!Number.isInteger(event.status))throw Error('Invalid search progress');onEvent(event);if(event.type==='result')result=event;}
 try{for(;;){const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});if(buffer.length>2_000_000)throw Error('Search progress too large');let end;while((end=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}if(done)break;}if(buffer.trim())consume(buffer);if(!result)throw Error('Search result missing');return result;}
 finally{reader.releaseLock();}
}
