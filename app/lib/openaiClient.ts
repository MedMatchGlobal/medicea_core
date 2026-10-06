import type OpenAI from "openai";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const ATTEMPT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 25_000;

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
export async function openaiFetch(url: string, init: RequestInit): Promise<Response> {
  if (url !== ENDPOINT) throw new Error("Unsupported OpenAI endpoint.");
  const keys = configuredKeys();
  if (!keys.length) throw new Error("No OpenAI API keys configured.");
  if (init.signal?.aborted) throw new Error("OpenAI request cancelled.");
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  let attempts = 0;
  for (const key of keys) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    init.signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    attempts++;
    let response: Response;
    let body: string;
    try {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${key}`);
      response = await fetch(ENDPOINT, {
        ...init, headers, cache: "no-store", signal: controller.signal,
      });
      // The timeout covers the response body as well as connection establishment.
      body = await response.text();
    } catch {
      if (init.signal?.aborted) throw new Error("OpenAI request cancelled.");
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
