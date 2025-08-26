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

function signBody(secret: string, body: string, timestamp: number) {
  const base = `${timestamp}.${body}`;
  const h = crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex");
  return { signature: h, timestamp };
}

/**
 * Event'i uygun endpoint'lere gönderir.
 * - nonBlocking=true ise: her endpoint için derhal "queued" bir delivery kaydı oluşturur,
 *   gerçek HTTP gönderimi arkaplanda yapar ve oluşturulan delivery dokümanlarını (queued) geri döner.
 * - nonBlocking=false/undefined ise: HTTP gönderimini bekler, delivery kayıtları son durumlarıyla döner.
 */
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

  const endpoints = await WebhookEndpoint.find(filter).lean<IWebhookEndpoint[]>();

  const tasks = endpoints.map((ep) =>
    deliverToEndpoint(WebhookDelivery, ep, eventType, payload, options)
  );

  // deliverToEndpoint nonBlocking modda "queued" docu hemen döner, arka planda gönderir
  const docs = await Promise.all(tasks);
  return docs;
}

async function deliverToEndpoint(
  WebhookDelivery: Model<IWebhookDelivery>,
  ep: IWebhookEndpoint,
  eventType: string,
  payload: any,
  options?: DispatchOptions
): Promise<IWebhookDelivery> {
  const bodyStr = JSON.stringify({ event: eventType, data: payload });
  const { signature, timestamp } = signBody(ep.secret, bodyStr, Math.floor(Date.now() / 1000));

  const headers: Record<string, string> = {
    "content-type": "application/json",
    [(ep.signing?.headerName || "x-mh-signature")]: `t=${timestamp},v=${ep.signing?.version || "v1"},hmac=${signature}`,
    [(ep.signing?.timestampHeaderName || "x-mh-timestamp")]: String(timestamp),
    "x-mh-event": eventType,
  };
  for (const kv of ep.headers || []) headers[kv.key] = kv.value;

  const httpsAgent = new https.Agent({ rejectUnauthorized: ep.verifySSL !== false });

  const max = clamp(options?.override?.maxAttempts ?? ep.retry?.maxAttempts ?? 3, 1, 10);
  const base = clamp(options?.override?.baseBackoffSec ?? ep.retry?.baseBackoffSec ?? 30, 1, 3600);
  const strategy = (options?.override?.strategy ?? ep.retry?.strategy ?? "exponential") as
    | "fixed"
    | "exponential";
  const timeout = clamp(options?.override?.timeoutMs ?? ep.retry?.timeoutMs ?? 15000, 1000, 120000);

  // 1) Önce "queued" delivery'yi oluştur
  const queued = await WebhookDelivery.create({
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
  });

  // 2) Asıl gönderimi çalıştıracak job
  const doSend = async () => {
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

    // sonuçları kaydet
    await WebhookDelivery.updateOne(
      { _id: queued._id },
      {
        $set: {
          attempt,
          success,
          responseStatus: lastStatus,
          responseBody: lastBody?.slice(0, 20000),
          error: success ? undefined : lastErr,
        },
      }
    );
  };

  if (options?.nonBlocking) {
    // Arkada çalıştır, "queued" doc'u hemen döndür
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    doSend();
    return queued;
  } else {
    await doSend();
    // son hâlini okuyup döndürmek istersen:
    const finalDoc = await WebhookDelivery.findById(queued._id).lean<IWebhookDelivery>();
    return finalDoc;
  }
}

/* ---------------- helpers ---------------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
