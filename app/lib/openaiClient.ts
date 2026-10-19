import type OpenAI from "openai";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const ATTEMPT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 25_000;

type EvaluationCall={model:string;status:number;ms:number;finish:string;usage:{input:number|null;output:number|null;cached:number|null;reasoning:number|null};webSearchCalls:number;text:string};
type EvaluationContext={legacy:boolean;calls:EvaluationCall[]};
let evaluationContext:import('node:async_hooks').AsyncLocalStorage<EvaluationContext>|undefined;
// Owner-requested model-only migration across the Travel test deployment.
// Original prompt routing and actual provider model selection are independent.
export function travelSolEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feature/travel-pack-preview'&&process.env.MEDICEA_TRAVEL_CONNECTED==='true'&&process.env.MEDICEA_OPENAI_UPGRADE==='true';}
// Model migration must not silently opt ordinary Dev features into new prompts.
// Only the explicitly selected evaluation arm retains experimental routing.
export function experimentalPromptsEnabled(){return modelUpgradeEnabled()&&(!travelSolEnabled()||evaluationContext?.getStore()?.legacy===false);}
/** Fixed-public-fixture owner tests only. Request-local; never changes env/global routing. */
export async function withOpenAIEvaluation<T>(legacy:boolean,run:()=>Promise<T>){
 if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='feature/travel-pack-preview'||process.env.MEDICEA_TRAVEL_CONNECTED!=='true'||process.env.MEDICEA_OPENAI_UPGRADE!=='true')throw Error('EVALUATION_DISABLED');
 const {AsyncLocalStorage}=await import('node:async_hooks');
 evaluationContext??=new AsyncLocalStorage<EvaluationContext>();
 const context:EvaluationContext={legacy,calls:[]};
 const value=await evaluationContext.run(context,run);
 return {value,calls:context.calls};
}
function recordEvaluation(context:EvaluationContext|undefined,body:string,status:number,ms:number,requestedModel:string){
 if(!context)return;
 try{const p=JSON.parse(body),u=p.usage||{},number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const text=p.choices?.[0]?.message?.content||(p.output||[]).filter((o:any)=>o.type==='message').flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('');
 context.calls.push({model:typeof p.model==='string'?p.model:requestedModel,status,ms,finish:p.choices?.[0]?.finish_reason||p.status||'unknown',usage:{input:number(u.prompt_tokens??u.input_tokens),output:number(u.completion_tokens??u.output_tokens),cached:number(u.prompt_tokens_details?.cached_tokens??u.input_tokens_details?.cached_tokens),reasoning:number(u.completion_tokens_details?.reasoning_tokens??u.output_tokens_details?.reasoning_tokens)},webSearchCalls:(p.output||[]).filter((o:any)=>o.type==='web_search_call').length,text:typeof text==='string'?text.slice(0,30000):''});
 }catch{context.calls.push({model:requestedModel,status,ms,finish:'unavailable',usage:{input:null,output:null,cached:null,reasoning:null},webSearchCalls:0,text:''});}
}

/** Opt-in migration transport. Preserve every route's prompt and output contract.
 * Production and unrecognised/pinned models keep the original request verbatim.
 */
export function modelUpgradeEnabled() {
  if(evaluationContext?.getStore()?.legacy)return false;
  const preview = process.env.VERCEL_ENV === "preview" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "development");
  // Owner-authorised, isolated tester deployment. Explicit false remains a
  // kill switch; no other branch or Production is opted in automatically.
  const testerBranch = process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/openai-model-upgrade-preview";
  return preview && (process.env.MEDICEA_OPENAI_UPGRADE === "true" ||
    (!process.env.MEDICEA_OPENAI_UPGRADE && testerBranch));
}

export function modelTestConfiguration() {
  return {enabled:modelUpgradeEnabled(),revision:'exact-match-v3.1',
    leafletFormat:travelSolEnabled()?'structured-v1':'legacy',
    matchingMode:travelSolEnabled()&&!experimentalPromptsEnabled()?'original-prompts':(process.env.VERCEL_GIT_COMMIT_REF==='feature/openai-model-upgrade-preview'||process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='feature/travel-pack-preview'&&process.env.MEDICEA_TRAVEL_CONNECTED==='true')&&process.env.MEDICEA_OPENAI_MATCHING_MODE!=='sources'?'prompt-test':'sources',
    researchModel:travelSolEnabled()?'gpt-6.1-sol':process.env.MEDICEA_OPENAI_SOURCE_MODEL||'gpt-6.1-sol',
    informationModel:travelSolEnabled()?'gpt-6.1-sol':process.env.MEDICEA_OPENAI_MEDICAL_MODEL||'gpt-6-luna'};
}
export function modelUpgradeRequest(init: RequestInit): RequestInit {
  const travelSol=travelSolEnabled();
  if (!modelUpgradeEnabled()&&!travelSol) return init;
  if (typeof init.body !== "string") throw new Error("Model upgrade requires a JSON request.");
  const body = JSON.parse(init.body);
  const legacy = body.model;
  const fast = legacy === "gpt-4o-mini";
  const travelLegacy=travelSol&&typeof legacy==='string'&&/^gpt-4(?:o(?:-|$)|(?:-|$))/.test(legacy);
  if (!fast && legacy !== "gpt-4o" && legacy !== "gpt-4" && !travelLegacy && !(travelSol&&legacy==='gpt-6.1-sol')) return init;
  if (body.stream || body.tools || body.functions || body.function_call) {
    throw new Error("Model upgrade requires a separate streaming/tool migration.");
  }
  const medicalModel = travelSol?'gpt-6.1-sol':process.env.MEDICEA_OPENAI_MEDICAL_MODEL || "gpt-6-luna";
  if (!["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"].includes(medicalModel)) {
    throw new Error("Unsupported Preview medical model.");
  }
  body.model = travelSol?'gpt-6.1-sol':fast ? "gpt-6-luna" : medicalModel;
  body.reasoning_effort = body.model === "gpt-6-luna" ? "none" : "low";
  // Astra reasoning does not accept sampling parameters. Seed is a legacy
  // reproducibility hint; the migration does not promise deterministic outputs.
  delete body.seed;
  if (body.reasoning_effort !== "none") {
    delete body.temperature; delete body.top_p; delete body.top_logprobs; delete body.logprobs;
  }
  if (body.max_tokens !== undefined) {
    body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
  }
  return {...init, body: JSON.stringify(body)};
}

function configuredKeys(): string[] {
  if (typeof window !== "undefined") throw new Error("OpenAI is server-only.");
  return [...new Set([
    process.env.OPENAI_API_KEY_1, process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3, process.env.OPENAI_API_KEY_4,
    process.env.OPENAI_API_KEY,
  ].map(key => key?.trim()).filter((key): key is string => Boolean(key)))];
}

export function getOpenAIKeyCount(): number { return configuredKeys().length; }

export class OpenAIRequestError extends Error {
  constructor(public readonly status: number, public readonly attempts: number) {
    // Upstream error messages can contain credentials or patient input.
    super(`OpenAI request failed (status ${status}, attempts ${attempts}).`);
    this.name = "OpenAIRequestError";
  }
}

function canFailOver(status: number, code: unknown): boolean {
  if (["misalignment_policy_violation", "content_policy_violation", "account_deactivated", "organization_deactivated"].includes(String(code))) return false;
  return status === 401 || status === 403 || status === 408 || status === 409 ||
    status === 429 || status >= 500;
}

/** Non-streaming requests. Attempt each distinct key once, in configured order.
 * A timeout can have an ambiguous outcome and failover may incur another charge.
 */
export async function openaiFetch(url: string, init: RequestInit, options:{singleAttempt?:boolean}={}): Promise<Response> {
  const evaluation=evaluationContext?.getStore();
  if(evaluation&&evaluation.calls.length>=3)throw Error('EVALUATION_CALL_LIMIT');
  const sourced = url === RESPONSES_ENDPOINT && (modelUpgradeEnabled()||travelSolEnabled());
  if (url !== ENDPOINT && !sourced) throw new Error("Unsupported OpenAI endpoint.");
  if (!sourced) init = modelUpgradeRequest(init);
  const travelResearch = !sourced && (modelUpgradeEnabled()||travelSolEnabled()) &&
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'feature/travel-pack-preview' &&
    process.env.MEDICEA_TRAVEL_CONNECTED === 'true' && typeof init.body === 'string' &&
    JSON.parse(init.body).model === modelTestConfiguration().researchModel;
  const keys = configuredKeys();
  const requestedModel=evaluation&&typeof init.body==='string'?String(JSON.parse(init.body).model||''):'';
  if (!keys.length) throw new Error("No OpenAI API keys configured.");
  if (init.signal?.aborted) throw new Error("OpenAI request cancelled.");
  const deadline = Date.now() + (sourced ? 45_000 : travelResearch ? 60_000 : REQUEST_TIMEOUT_MS);
  let attempts = 0;
  for (const key of keys) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    init.signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, Math.min(sourced ? 40_000 : travelResearch ? 55_000 : ATTEMPT_TIMEOUT_MS, remaining));
    attempts++;
    let response: Response;
    let body: string;
    const attemptStart=Date.now();
    try {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${key}`);
      response = await fetch(url, {
        ...init, headers, cache: "no-store", signal: controller.signal,
      });
      // The timeout covers the response body as well as connection establishment.
      body = await response.text();
      recordEvaluation(evaluation,body,response.status,Date.now()-attemptStart,requestedModel);
    } catch {
      recordEvaluation(evaluation,'',504,Date.now()-attemptStart,requestedModel);
      if (init.signal?.aborted) throw new Error("OpenAI request cancelled.");
      // A slow research request may still complete upstream after disconnect.
      // Do not multiply that ambiguous charge by retrying it with another key.
      if (options.singleAttempt||travelResearch||evaluation) throw new OpenAIRequestError(504, attempts);
      if (attempts === keys.length) throw new OpenAIRequestError(504, attempts);
      console.warn("[OpenAI] Trying next key after connection failure", { attempt: attempts });
      continue;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", cancel);
    }
    if (response.ok) {
      return new Response(body, { status: response.status, headers: response.headers });
    }
    if(options.singleAttempt||evaluation)throw new OpenAIRequestError(response.status,attempts);
    let code: unknown;
    try { code = JSON.parse(body)?.error?.code; } catch { /* non-JSON upstream error */ }
    if (!canFailOver(response.status, code) || attempts === keys.length) {
      throw new OpenAIRequestError(response.status, attempts);
    }
    console.warn("[OpenAI] Trying next key", { attempt: attempts, status: response.status });
    // Respect provider backoff before another attempt; never retry the failed key.
    const retryAfter = response.headers.get("retry-after");
    const delay = retryAfter ? (/^\d+(\.\d+)?$/.test(retryAfter)
      ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now())) : 0;
    if (Number.isFinite(delay) && delay > 0) {
      if (delay >= deadline - Date.now()) throw new OpenAIRequestError(response.status, attempts);
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(wait);
          init.signal?.removeEventListener("abort", abort);
          reject(new Error("OpenAI request cancelled."));
        };
        const wait = setTimeout(() => { init.signal?.removeEventListener("abort", abort); resolve(); }, delay);
        init.signal?.addEventListener("abort", abort, { once: true });
        if (init.signal?.aborted) abort();
      });
    }
  }
  throw new OpenAIRequestError(504, attempts);
}

export async function createChatCompletion(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const response = await openaiFetch(ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}
