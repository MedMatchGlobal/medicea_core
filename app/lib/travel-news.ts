import {parseStringPromise} from 'xml2js';
export type HealthNotice={title:string;url:string;published:string;source:'MHRA';language:'en'};
export const UK_HEALTH_FEED='https://www.gov.uk/drug-device-alerts.atom';
export async function parseHealthNotices(xml:string):Promise<HealthNotice[]>{
 if(xml.length>500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid feed');
 const parsed=await parseStringPromise(xml,{explicitArray:true,strict:true});
 const entries=parsed?.feed?.entry;if(!Array.isArray(entries))throw Error('Invalid feed');
 const found=new Set<string>(),items:HealthNotice[]=[];
 for(const entry of entries.slice(0,100)){
  const raw=entry.title?.[0],title=(typeof raw==='string'?raw:raw?._||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  const link=entry.link?.find((l:any)=>l.$?.rel==='alternate')?.$?.href,published=entry.published?.[0]||entry.updated?.[0];
  if(typeof link!=='string'||typeof published!=='string'||!title||title.length>800||!Number.isFinite(Date.parse(published)))continue;
  let url:URL;try{url=new URL(link);}catch{continue;}
  if(url.origin!=='https://www.gov.uk'||!url.pathname.startsWith('/drug-device-alerts/')||url.username||url.password||found.has(url.href)||Date.parse(published)>Date.now()+86400000)continue;
  found.add(url.href);items.push({title,url:url.href,published:new Date(published).toISOString(),source:'MHRA',language:'en'});
 }
 return items.sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)).slice(0,12);
}
