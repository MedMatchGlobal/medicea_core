import {claudePreviewEnabled} from '../claude-preview';
import {auditResearch} from './medicea-grounding-kit';
import {evaluateGroundedProducts,isProduct} from './evaluate-grounded-products';
import config from './trial-config.json';

const str={type:'string'}, nullable={type:['string','null']}, ids={type:'array',items:str};
const obj=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const code=obj({system:str,code:str});
const sourced=(canonical:unknown)=>obj({raw:nullable,canonical:{anyOf:[canonical,{type:'null'}]},status:{enum:['resolved','ambiguous','unresolved']},evidence:ids});
const strength=obj({raw:nullable,value:{type:['number','null']},unit:nullable,per_value:{type:['number','null']},per_unit:nullable,basis:{enum:['as_written','base_equivalent','unspecified']},status:{enum:['resolved','ambiguous','unresolved']},evidence:ids});
const product=obj({country:str,name_as_written:str,registry:obj({name:nullable,id:nullable,holder:nullable}),authorisation:sourced(str),legal_status:sourced(str),marketing:obj({status:str,as_of:nullable,evidence:ids}),dose_form_as_written:nullable,dose_form:sourced(code),attributes:{type:'object',additionalProperties:sourced(str)},ingredients:{type:'array',items:obj({name_as_written:str,moiety:sourced(code),stated_form:sourced(code),strength})},ingredients_complete:{type:'boolean'},excipients_of_note:{type:'array',items:obj({raw:str,evidence:ids})},excipients:obj({completeness:{enum:['complete','partial','unavailable']},items:{type:'array',items:obj({name_as_written:str,identity:sourced(code),quantity:sourced(str)})},evidence:ids})});
export const extractionSchema=obj({source:product,candidates:{type:'array',maxItems:20,items:product},evidence:{type:'array',items:obj({id:str,url:str,source_type:str,supports_text:{type:'string',maxLength:150}})},not_found_notes:{type:'array',items:str}});
export const trialPrompt=config.researchPrompt.replaceAll('{{source_country}}',config.sourceCountry).replaceAll('{{target_country}}',config.targetCountry).replaceAll('{{target_languages}}',config.targetLanguages.join(', ')).replaceAll('{{source_product}}',JSON.stringify(config.sourceProduct,null,2));
export async function groundingTrial(req:Request):Promise<Response>{
 if(!claudePreviewEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'INVALID_ORIGIN'},{status:403});
 const started=Date.now(),deadline=started+config.limits.totalMs,usage:unknown[]=[];
 const key=process.env.ANTHROPIC_API_KEY?.trim();if(!key)return Response.json({error:'KEY_UNAVAILABLE'},{status:503});
 async function call(body:object){
  const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,Math.max(1,deadline-Date.now()));
  req.signal.addEventListener('abort',cancel,{once:true});if(req.signal.aborted)cancel();
  try{
   const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key,'anthropic-version':'2023-06-01'},cache:'no-store',signal:controller.signal,body:JSON.stringify({model:'claude-sonnet-5-5',output_config:{effort:'medium'},...body})});
   const payload=await response.json();if(!response.ok)throw Error('PROVIDER_HTTP_'+response.status);
   usage.push(payload.usage);return payload;
  }finally{clearTimeout(timer);req.signal.removeEventListener('abort',cancel);}
 }
 const headers={'Cache-Control':'no-store'};
 try{
  const messages=[{role:'user',content:'Research the selected source product and destination products using the supplied instructions.'}];
  const research=await call({system:trialPrompt,messages,max_tokens:config.limits.researchTokens,tools:[{type:'web_search_20250305',name:'web_search',max_uses:config.limits.searches}]});
  const audit=auditResearch([research],{minSearches:1,minResultBearing:1});
  const summary=(r:typeof audit)=>({...r,retrievedUrls:[...r.retrievedUrls],citedUrls:[...r.citedUrls]});
  const researchText=Array.isArray(research.content)?research.content.filter((b:any)=>b.type==='text').map((b:any)=>b.text).join('\n\n'):'';
  // Stop rather than spending again if search never ran, failed, or the turn paused.
  if(!audit.ok)return Response.json({stage:'research_unverified',audit:summary(audit),researchText,usage,elapsedMs:Date.now()-started,rows:[],notice:'Research did not pass its audit. No extraction or automatic retry was run.'},{headers});
  const extractionMessage=config.extractionPrompt.replaceAll('{{attribute_vocabulary}}',JSON.stringify(config.vocabulary))+ '\nUse the submit_equivalents schema. Also retain full excipient lists separately as excipients, with completeness and quantities; unavailable is valid. No terminology snapshot has been approved: empty vocabulary entries mean unresolved attributes. Do not invent substance or form codes. Do not output proposed_rules in this trial.';
  const extraction=await call({system:trialPrompt,messages:[...messages,{role:'assistant',content:research.content},{role:'user',content:extractionMessage}],max_tokens:config.limits.extractionTokens,tools:[{name:'submit_equivalents',description:'Record source-backed product facts, preserving unresolved information.',input_schema:extractionSchema}],tool_choice:{type:'tool',name:'submit_equivalents'}});
  const tool=extraction.content?.find((b:any)=>b.type==='tool_use'&&b.name==='submit_equivalents');
  if(extraction.stop_reason!=='tool_use'||!tool?.input||!isProduct(tool.input.source)||!Array.isArray(tool.input.candidates)||tool.input.candidates.length>20||!Array.isArray(tool.input.evidence))throw Error('INVALID_EXTRACTION');
  const data=tool.input;
  const rows=data.candidates.map((candidate:unknown)=>({product:candidate,result:evaluateGroundedProducts({source:data.source,candidate,evidence:data.evidence,responses:[research],auditOptions:{minSearches:1,minResultBearing:1},policy:{attributes:{route:'gate',release:'gate',basic_form:'gate'}},vocab:config.vocabulary,context:{documents:[]}})}));
  return Response.json({stage:'complete',source:data.source,rows,evidence:data.evidence,notes:data.not_found_notes,audit:summary(audit),researchText,usage,elapsedMs:Date.now()-started,notice:'Research and extraction trial. Independent registry/terminology adapters are not connected; no candidate is promoted to a confirmed match on model output alone.'},{headers});
 }catch(error){
  const known=error instanceof Error&&/^PROVIDER_HTTP_\d+$|^INVALID_EXTRACTION$/.test(error.message)?error.message:'TRIAL_UNAVAILABLE';
  return Response.json({error:known,usage,elapsedMs:Date.now()-started,notice:'Stopped without retry. No confirmed equivalence result was produced.'},{status:503,headers});
 }
}
