import crypto from "crypto";
import axios from "axios";
import https from "https";
import type { Model } from "mongoose";
import type { IWebhookEndpoint, IWebhookDelivery } from "./types";

type DispatchInput = {
  tenant: string;
  eventType: string;
  payload: any;
  onlyEndpointId?: string; // belirli endpoint'e gönder
};

type DispatchOptions = {
  /** Gönderimi arkada çalıştır; fonksiyon hemen dönsün. */
  nonBlocking?: boolean;
  /** O anlık deneme için retry ayarlarını geçici override et. */
  override?: {
    maxAttempts?: number;
    strategy?: "fixed" | "exponential";
    baseBackoffSec?: number;
    timeoutMs?: number;
  };
};

const RESERVED_HEADERS = new Set(["content-type","x-mh-signature","x-mh-timestamp","x-mh-event"]);

function signBody(secret: string, body: string, timestamp: number) {
  const base = `${timestamp}.${body}`;
  const h = crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex");
  return { signature: h, timestamp };
}

export async function publishEvent(
  WebhookEndpoint: Model<IWebhookEndpoint>,
  WebhookDelivery: Model<IWebhookDelivery>,
  input: DispatchInput,
  options?: DispatchOptions
): Promise<IWebhookDelivery[]> {
  const { tenant, eventType, payload, onlyEndpointId } = input;
  const filter: any = { tenant, isActive: true };
  if (onlyEndpointId) filter._id = onlyEndpointId;
  else filter.$or = [{ events: "*" }, { events: eventType }];

  // secret select:false olduğundan burada explicit seçiyoruz
  const endpoints = await WebhookEndpoint.find(filter)
    .select("+secret")
    .lean<IWebhookEndpoint[]>();

  const tasks = endpoints.map((ep) =>
    deliverToEndpoint(WebhookEndpoint, WebhookDelivery, ep as any, eventType, payload, options)
  );

  const docs = await Promise.all(tasks);
  return docs;
}

async function deliverToEndpoint(
  WebhookEndpointModel: Model<IWebhookEndpoint>,
  WebhookDeliveryModel: Model<IWebhookDelivery>,
  ep: IWebhookEndpoint,
  eventType: string,
  payload: any,
  options?: DispatchOptions
): Promise<IWebhookDelivery> {
  const bodyStr = JSON.stringify({ event: eventType, data: payload });
  const { signature, timestamp } = signBody((ep as any).secret, bodyStr, Math.floor(Date.now() / 1000));

  // ÖNCE custom header'ları filtrele, sonra sistemkileri bind et (sistem kazanır)
  const custom: Record<string, string> = {};
  for (const kv of ep.headers || []) {
    const keyLc = String(kv.key || "").toLowerCase();
    if (!keyLc || RESERVED_HEADERS.has(keyLc)) continue;
    custom[kv.key] = String(kv.value ?? "");
  }

  const system: Record<string, string> = {
    "content-type": "application/json",
    [(ep.signing?.headerName || "x-mh-signature")]:
      `t=${timestamp},v=${ep.signing?.version || "v1"},hmac=${signature}`,
    [(ep.signing?.timestampHeaderName || "x-mh-timestamp")]: String(timestamp),
    "x-mh-event": eventType,
  };

  const headers: Record<string, string> = { ...custom, ...system };
  const httpsAgent = new https.Agent({ rejectUnauthorized: ep.verifySSL !== false });

  const max = clamp(options?.override?.maxAttempts ?? ep.retry?.maxAttempts ?? 3, 1, 10);
  const base = clamp(options?.override?.baseBackoffSec ?? ep.retry?.baseBackoffSec ?? 30, 1, 3600);
  const strategy = (options?.override?.strategy ?? ep.retry?.strategy ?? "exponential") as
    | "fixed"
    | "exponential";
  const timeout = clamp(options?.override?.timeoutMs ?? ep.retry?.timeoutMs ?? 15000, 1000, 120000);

  // 1) Önce "queued" delivery'yi oluştur
  const queued = await WebhookDeliveryModel.create({
    tenant: ep.tenant,
    endpointRef: (ep as any)._id,
    eventType,
    payload,
    attempt: 0,
    success: false,
    requestHeaders: headers,
    responseStatus: undefined,
    responseBody: undefined,
    error: "queued",
    durationMs: 0,
  });

  // 2) Asıl gönderimi çalıştıracak job
  const doSend = async () => {
    const t0 = Date.now();
    let attempt = 0;
    let success = false;
    let lastErr: any = null;
    let lastStatus: number | undefined;
    let lastBody: string | undefined;

    while (attempt < max && !success) {
      attempt += 1;
      try {
        const resp = await axios.request({
          url: ep.targetUrl,
          method: ep.httpMethod || "POST",
          headers,
          data: bodyStr,
          timeout,
          httpsAgent,
          validateStatus: () => true,
        });
        lastStatus = resp.status;
        lastBody = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
        success = resp.status >= 200 && resp.status < 300;
        if (!success) throw new Error(`http_${resp.status}`);
      } catch (e: any) {
        lastErr = e?.message || String(e);
        if (attempt < max) {
          const waitSec = strategy === "fixed" ? base : base * Math.pow(2, attempt - 1);
          await sleep(waitSec * 1000);
        }
      }
    }

    const durationMs = Date.now() - t0;

    // sonuçları kaydet
    await WebhookDeliveryModel.updateOne(
      { _id: (queued as any)._id },
      {
        $set: {
          attempt,
          success,
          responseStatus: lastStatus,
          responseBody: lastBody?.slice(0, 20000),
          error: success ? undefined : lastErr,
          durationMs,
        },
      }
    );

    // endpoint quick stats
    await WebhookEndpointModel.updateOne(
      { _id: (ep as any)._id },
      { $set: { lastDeliveredAt: new Date(), lastStatus: lastStatus } }
    );
  };

  if (options?.nonBlocking) {
    // Arkada çalıştır, "queued" doc'u hemen döndür
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try { await doSend(); } catch (_e) { /* swallow & log if you add logger */ }
    })();
    return queued;
  } else {
    try { await doSend(); } catch (_e) { /* swallow & continue */ }
    const finalDoc = await WebhookDeliveryModel.findById((queued as any)._id).lean<IWebhookDelivery>();
    return finalDoc!;
  }
}

/* ---------------- helpers ---------------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
