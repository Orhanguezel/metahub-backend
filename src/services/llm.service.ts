// src/services/llm.service.ts
type Provider = "groq" | "grok";
type Msg = { role: "system" | "user" | "assistant"; content: string };

type ChatArgs = {
  provider?: Provider;
  model?: string;
  messages: Msg[];
  temperature?: number;
  /** When true, ask provider to return a strict JSON object. */
  forceJson?: boolean;
  /** Total attempts including first try. Default: 3 */
  maxRetries?: number;
  /** Per-request timeout ms (fetch). Default: 30000 */
  timeoutMs?: number;
};

export class LLMError extends Error {
  provider: Provider;
  status?: number;
  code?: string;
  body?: any;
  constructor(opts: { provider: Provider; message: string; status?: number; code?: string; body?: any }) {
    super(opts.message);
    this.name = "LLMError";
    this.provider = opts.provider;
    this.status = opts.status;
    this.code = opts.code;
    this.body = opts.body;
  }
}

/** Prefer AI_PROVIDER, then LLM_PROVIDER; fallback 'groq' */
function getEnvProvider(): Provider {
  const p = (process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "groq").toLowerCase();
  return (p === "grok" ? "grok" : "groq");
}

/** Extract ms from Retry-After header or typical messages */
function parseRetryAfterMsFromAny(hdr?: string, msg?: string): number | undefined {
  if (hdr) {
    // header can be seconds
    const sec = Number(hdr);
    if (Number.isFinite(sec) && sec >= 0) return Math.ceil(sec * 1000);
  }
  if (!msg) return;
  const m = msg.match(/try again in\s+(\d+)\s*(ms|milliseconds)?/i);
  if (m) return parseInt(m[1], 10);
  const s = msg.match(/(\d+(?:\.\d+)?)\s*s(ec|econds)?/i);
  if (s) return Math.ceil(parseFloat(s[1]) * 1000);
  return;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export function extractJsonSafe(text: string): any {
  if (!text) throw new Error("Empty LLM response");
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try { return JSON.parse(trimmed); } catch {}

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try { return JSON.parse(slice); } catch {}
  }
  throw new Error("LLM response is not valid JSON");
}

async function postJSON(url: string, headers: Record<string, string>, body: any, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await resp.json().catch(() => ({}));
    return { resp, json };
  } finally {
    clearTimeout(t);
  }
}

export async function llmChat({
  provider = getEnvProvider(),
  model,
  messages,
  temperature = 0.7,
  forceJson = false,
  maxRetries,
  timeoutMs = 30000,
}: ChatArgs): Promise<string> {
  if (!globalThis.fetch) throw new Error("fetch is not available in this Node runtime");

  const maxAttempts = typeof maxRetries === "number" && maxRetries > 0 ? maxRetries : 3;
  let attempt = 0;

  // pick env-models safely
  const groqModel = model || process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const grokModel = model || process.env.GROK_MODEL || "grok-3-mini";

  while (true) {
    attempt++;

    try {
      if (provider === "groq") {
        const key = process.env.GROQ_API_KEY;
        if (!key) throw new LLMError({ provider, message: "GROQ_API_KEY missing" });

        const body: any = { model: groqModel, messages, temperature };
        if (forceJson) body.response_format = { type: "json_object" };

        const { resp, json } = await postJSON(
          "https://api.groq.com/openai/v1/chat/completions",
          { Authorization: `Bearer ${key}` },
          body,
          timeoutMs
        );

        if (!resp.ok) {
          const code = json?.error?.code || json?.code;
          const msg = json?.error?.message || json?.message || `HTTP ${resp.status}`;
          const raMs = parseRetryAfterMsFromAny(resp.headers.get("retry-after") || undefined, msg);
          if ((resp.status === 429 || code === "rate_limit_exceeded") && attempt < maxAttempts) {
            await sleep(raMs ?? 1200);
            continue;
          }
          throw new LLMError({ provider, status: resp.status, code, message: msg, body: json });
        }
        const content = String(json?.choices?.[0]?.message?.content ?? "");
        if (!content) throw new LLMError({ provider, message: "Empty completion content", body: json });
        return content;
      }

      // xAI (Grok)
      const key = process.env.XAI_API_KEY;
      if (!key) throw new LLMError({ provider, message: "XAI_API_KEY missing" });

      const body: any = { model: grokModel, messages, temperature };
      if (forceJson) body.response_format = { type: "json_object" };

      const { resp, json } = await postJSON(
        "https://api.x.ai/v1/chat/completions",
        { Authorization: `Bearer ${key}` },
        body,
        timeoutMs
      );

      if (!resp.ok) {
        const code = json?.error?.code || json?.code;
        const msg = json?.error?.message || json?.message || `HTTP ${resp.status}`;
        const raMs = parseRetryAfterMsFromAny(resp.headers.get("retry-after") || undefined, msg);
        if (resp.status === 429 && attempt < maxAttempts) {
          await sleep(raMs ?? 1200);
          continue;
        }
        throw new LLMError({ provider, status: resp.status, code, message: msg, body: json });
      }
      const content = String(json?.choices?.[0]?.message?.content ?? "");
      if (!content) throw new LLMError({ provider, message: "Empty completion content", body: json });
      return content;

    } catch (err: any) {
      // Ağ/parse/timeout veya LLMError: yeniden dene ya da yükselt
      if (attempt < maxAttempts) {
        await sleep(800);
        continue;
      }
      // burada maskeleme YOK — üst katmana tüm ayrıntılar gidecek
      if (err instanceof LLMError) throw err;
      const msg = err?.name === "AbortError" ? "Request timeout" : (err?.message || "Unknown LLM error");
      throw new LLMError({ provider, message: msg });
    }
  }
}
