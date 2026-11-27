// Single place that decides which AI provider and model serve Medicea.
// Resolution order (first match wins):
//   1. Vercel Edge Config item "ai" (instant switch, no redeploy). Never holds keys.
//   2. Environment variables MEDICEA_AI_PROVIDER / MEDICEA_AI_MODEL.
//   3. Legacy rule: the design/riviera-one-page Preview deployment uses Claude.
//   4. Default: openai (current production behaviour).
// There is deliberately NO runtime fallback between providers: when anthropic
// is selected and it fails, the request fails. Falling back to another model
// would silently change medical answers.
export type AiProvider='openai'|'anthropic';
export type AiConfig={provider:AiProvider;model:string;source:'edge-config'|'env'|'legacy-preview'|'default'};
export const DEFAULT_CLAUDE_MODEL='claude-sonnet-5-5';
const MODEL_PATTERN=/^claude-[a-z0-9][a-z0-9.-]{2,60}$/;
const TTL_MS=10_000;
let cached:{at:number;value:Partial<Record<AiProvider|'model',string>>|null}|null=null;

function environmentName(){return process.env.VERCEL_ENV||'development';}
function legacyPreview(){return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='design/riviera-one-page'&&process.env.MEDICEA_CLAUDE_PREVIEW!=='false';}
function cleanModel(value:unknown){return typeof value==='string'&&MODEL_PATTERN.test(value.trim())?value.trim():undefined;}
function cleanProvider(value:unknown):AiProvider|undefined{const v=typeof value==='string'?value.trim().toLowerCase():'';return v==='openai'||v==='anthropic'?v:undefined;}

// Synchronous resolution from whatever has been loaded so far plus the
// environment. Edge Config values appear after refreshAiConfig() has run.
export function aiConfig():AiConfig{
 const edge=cached?.value as any;
 const fromEdge=edge&&(edge[environmentName()]||edge.default||edge);
 const edgeProvider=cleanProvider(fromEdge?.provider);
 if(edgeProvider)return {provider:edgeProvider,model:cleanModel(fromEdge?.model)||cleanModel(process.env.MEDICEA_AI_MODEL)||DEFAULT_CLAUDE_MODEL,source:'edge-config'};
 const envProvider=cleanProvider(process.env.MEDICEA_AI_PROVIDER);
 if(envProvider)return {provider:envProvider,model:cleanModel(process.env.MEDICEA_AI_MODEL)||DEFAULT_CLAUDE_MODEL,source:'env'};
 if(legacyPreview())return {provider:'anthropic',model:cleanModel(process.env.MEDICEA_AI_MODEL)||DEFAULT_CLAUDE_MODEL,source:'legacy-preview'};
 return {provider:'openai',model:cleanModel(process.env.MEDICEA_AI_MODEL)||DEFAULT_CLAUDE_MODEL,source:'default'};
}
export function aiProvider():AiProvider{return aiConfig().provider;}
export function claudeModel(){return aiConfig().model;}

// Debug pages, the public-product diagnostic and evaluation capture stay
// limited to the owner's design Preview, independent of the provider switch.
export function previewToolsEnabled(){return legacyPreview();}

// Reads the Edge Config item "ai" with the connection string Vercel injects as
// EDGE_CONFIG. Uses the plain REST endpoint so no new dependency is needed.
// A failed read keeps the last good value; it never invents a provider.
export async function refreshAiConfig(force=false):Promise<AiConfig>{
 const connection=process.env.EDGE_CONFIG;
 if(connection&&(force||!cached||Date.now()-cached.at>TTL_MS)){
  try{
   const url=new URL(connection);const token=url.searchParams.get('token');
   const response=await fetch(`${url.origin}${url.pathname.replace(/\/$/,'')}/item/ai`,{headers:token?{Authorization:'Bearer '+token}:{},cache:'no-store',signal:AbortSignal.timeout(1500)});
   if(response.ok)cached={at:Date.now(),value:await response.json()};
   else if(response.status===404)cached={at:Date.now(),value:null};
   else{cached={at:Date.now(),value:cached?.value??null};console.warn('[ai-config] edge config read status',response.status);}
  }catch{cached={at:Date.now(),value:cached?.value??null};console.warn('[ai-config] edge config unavailable; keeping last known value');}
 }
 return aiConfig();
}
export function resetAiConfigForTests(){cached=null;}
