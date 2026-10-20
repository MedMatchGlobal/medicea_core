import baseline from './leaflet-comparison-fixtures/0940.json';
import current from './leaflet-comparison-fixtures/current.json';
import {openaiFetch,travelSolEnabled} from './openaiClient';
import {researchUrl,retrievedResearchUrls,matchRetrievedLeafletSources} from './research-sources';
import {validateLeaflet,REQUIRED_LEAFLET_TOPICS} from './leaflet-contract';

export const LEAFLET_COMPARISON_ARMS=['0940','current','0940-three-actions','current-one-action'] as const;
export type LeafletComparisonArm=typeof LEAFLET_COMPARISON_ARMS[number];
// Live comparison is off after the authorised run. Re-enabling requires an
// explicit Dev environment flag; normal leaflet handling never uses this path.
export function leafletComparisonEnabled(){return travelSolEnabled()&&process.env.MEDICEA_LEAFLET_COMPARISON==='true';}
export function leafletComparisonRequest(arm:LeafletComparisonArm){
 const fixture=arm.startsWith('0940')?baseline:current;
 const request=JSON.parse(JSON.stringify(fixture));
 if(arm==='0940-three-actions')request.body.max_tool_calls=3;
 if(arm==='current-one-action')request.body.max_tool_calls=1;
 return request;
}
export function assessLeafletComparison(payload:any){
 const completed=(payload?.output||[]).filter((o:any)=>o.type==='web_search_call'&&o.status==='completed');
 const exact=retrievedResearchUrls(payload),opened=retrievedResearchUrls(payload,true);
 const text=(payload?.output||[]).filter((o:any)=>o.type==='message').flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
 let value:any;try{value=JSON.parse(text);}catch{return {status:'invalid_json',webActions:completed.length};}
 const claimed=Array.isArray(value.sources)?value.sources:[];
 const historicalAccepted=claimed.length>0&&claimed.length<=5&&claimed.every((s:unknown)=>{const url=researchUrl(s);return url&&exact.has(url);});
 let currentAccepted=false;try{matchRetrievedLeafletSources(value.sources,opened);currentAccepted=true;}catch{}
 let missing:string[]=[];let structureValid=true;
 try{const sections=validateLeaflet({information_sections:value.information_sections});missing=REQUIRED_LEAFLET_TOPICS.filter(key=>!sections.find(s=>s.key===key)?.bullets.length);}catch{structureValid=false;}
 const locations=(urls:unknown[])=>urls.slice(0,30).map(value=>{const safe=researchUrl(value);if(!safe)return '[invalid URL]';const url=new URL(safe);return url.origin+url.pathname;});
 return {status:payload.status,webActions:completed.length,sourceChecks:{historicalAccepted,currentAccepted},structureValid,missingSections:missing,claimed:locations(claimed),retrieved:locations([...opened]),unmatched:locations(claimed.filter((s:unknown)=>{try{matchRetrievedLeafletSources([s],opened);return false;}catch{return true;}}))};
}
// Fixed public fixture only; no custom prompt, query, URL, country or model.
export async function runLeafletComparison(arm:LeafletComparisonArm){
 if(!leafletComparisonEnabled())throw Error('COMPARISON_DISABLED');
 const request=leafletComparisonRequest(arm),started=Date.now();
 try{
  const response=await openaiFetch(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.body)},{singleAttempt:true});
  const payload=await response.json();return {arm,ms:Date.now()-started,model:request.body.model,maxWebActions:request.body.max_tool_calls,...assessLeafletComparison(payload)};
 }catch(error){const status=(error as {status?:number})?.status;return {arm,ms:Date.now()-started,status:status===504?'provider_timeout':'provider_error',providerStatus:typeof status==='number'?status:null};}
}
