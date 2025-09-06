// backend/services/llm.service.ts
import fetch from "node-fetch";

type Provider = "grok" | "groq";
type Msg = { role: "system" | "user"; content: string };

type ChatArgs = {
  provider?: Provider;
  model?: string;
  messages: Msg[];
  temperature?: number;
  /** JSON modunu açıkla: OpenAI uyumlu API'lerde { type: "json_object" } gönderir */
  forceJson?: boolean;
};

/** Gelen metinden JSON'u güvenli çıkarmaya çalışır (code fence, prefix/suffix, BOM, vb.). */
export function extractJsonSafe(text: string): any {
  if (!text) throw new Error("Empty LLM response");
  const trimmed = text
    .trim()
    // ```json ... ``` veya ``` ... ``` bloklarını temizle
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 1) Doğrudan parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2) İlk { ile son } arasını al
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }

  throw new Error("LLM response is not valid JSON");
}

export async function llmChat({
  provider = (process.env.LLM_PROVIDER as Provider) || "grok",
  model,
  messages,
  temperature = 0.7,
  forceJson = false,
}: ChatArgs): Promise<string> {
  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY missing");
    const m = model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const body: any = { model: m, messages, temperature };
    // JSON mode (OpenAI uyumlu)
    if (forceJson) body.response_format = { type: "json_object" };

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(`GROQ ${resp.status} ${JSON.stringify(json)}`);
    return String(json?.choices?.[0]?.message?.content ?? "");
  }

  // xAI (Grok)
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY missing");
  const m = model || process.env.GROK_MODEL || "grok-2-mini";

  const body: any = { model: m, messages, temperature };
  // xAI da OpenAI uyumlu endpoint sağlıyor; bazı modellerde JSON mode destekli
  if (forceJson) body.response_format = { type: "json_object" };

  const resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(`GROK ${resp.status} ${JSON.stringify(json)}`);
  return String(json?.choices?.[0]?.message?.content ?? "");
}
