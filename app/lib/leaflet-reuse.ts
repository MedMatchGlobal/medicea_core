import {createHash} from 'node:crypto';
type Ready=(value:unknown)=>void;
type Stored={body:string;status:number;headers:[string,string][]};
type Entry={until:number;pending:boolean;ready?:unknown;listeners:Set<Ready>;result:Promise<Stored>};
const entries=new Map<string,Entry>(),TTL=10*60_000,MAX=64;
// Exact public-product requests only, in memory on this Preview instance.
// Authentication and signed product validation happen before this helper.
export async function reuseLeaflet(identity:string,run:(ready:Ready)=>Promise<Response>,onReady?:Ready):Promise<Response>{
 const key=createHash('sha256').update(identity).digest('hex'),now=Date.now();
 for(const [k,e] of entries)if(!e.pending&&e.until<=now)entries.delete(k);
 let entry=entries.get(key),reused=!!entry;
 if(!entry){
  if(entries.size>=MAX){const oldest=[...entries].find(([,e])=>!e.pending);if(oldest)entries.delete(oldest[0]);}
  entry={until:now+TTL,pending:true,listeners:new Set(),result:undefined!};
  const current=entry;
  if(entries.size<MAX)entries.set(key,current);
  current.result=Promise.resolve().then(()=>run(value=>{current.ready=value;for(const listener of current.listeners)try{listener(value);}catch{/* disconnected consumer */}})).then(async response=>{
   const body=await response.text();current.pending=false;current.until=Date.now()+TTL;current.listeners.clear();
   if((!response.ok||response.headers.get('X-Medicea-Leaflet-Cacheable')==='0')&&entries.get(key)===current)entries.delete(key);
   return {body,status:response.status,headers:[...response.headers] as [string,string][]};
  }).catch(error=>{if(entries.get(key)===current)entries.delete(key);throw error;});
 }
 if(onReady){if(entry.ready!==undefined)onReady(entry.ready);else entry.listeners.add(onReady);}
 const value=await entry.result,headers=new Headers(value.headers);
 if(reused)headers.set('Server-Timing','reuse;dur=0');
 headers.set('X-Medicea-Leaflet-Reused',reused?'1':'0');
 return new Response(value.body,{status:value.status,headers});
}
