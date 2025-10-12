// src/modules/payments/gateway/adapters/paytr.adapter.ts
import type {
  GatewayAdapter, CreateCheckoutInput, CreateCheckoutOutput,
  CaptureInput, CaptureOutput, RefundInput, RefundOutput,
  WebhookEvent, GatewayCredentials
} from "../../types/gateway.types";
import type { Request } from "express";
import crypto from "crypto";

/* ---------------- helpers ---------------- */
const normCur = (c?: string) => String(c || "TRY").toUpperCase();
const toMinorInt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("amount_invalid");
  const r = Math.round(n);
  if (r <= 0) throw new Error("amount_invalid_positive");
  return r;
};
const timingSafeEq = (a: string, b: string) => {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

/* PayTR bildirim (webhook) hash kontrolü (en yaygın şema)
   hash = base64( sha256( merchant_oid + merchant_salt + status + total_amount ) )  */
function verifyPaytrHash(body: any, creds: GatewayCredentials): boolean {
  try {
    const merchant_salt = String((creds as any)?.merchantSalt || "");
    const status = String(body?.status || "");
    const merchant_oid = String(body?.merchant_oid || "");
    const total_amount = String(body?.total_amount || "");
    const server_hash = String(body?.hash || body?.paytr_token || "");

    if (!merchant_salt || !server_hash || !merchant_oid || !status || !total_amount) return false;

    const data = merchant_oid + merchant_salt + status + total_amount;
    const calc = crypto.createHash("sha256").update(data, "utf8").digest("base64");
    return timingSafeEq(calc, server_hash);
  } catch {
    return false;
  }
}

export class PaytrAdapter implements GatewayAdapter {
  readonly name = "paytr" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    // NOT: Gerçek entegrasyonda PayTR iframe/token servisleri çağrılır.
    // Burada en azından amount/currency normalize ediyoruz:
    const _amount = toMinorInt(input.amount);
    const _currency = normCur(input.currency);
    const ref = `pt_${Date.now()}`;
    return { providerRef: ref, hostedUrl: `https://www.paytr.com/odeme/guvenli/${ref}`, payload: { amount: _amount, currency: _currency } };
  }

  async capture(_input: CaptureInput): Promise<CaptureOutput> {
    // PayTR çoğunlukla otorizasyon+satış birlikte; ayrı capture çoğu akışta yok.
    return { ok: true, status: "succeeded" };
  }

  async refund(_input: RefundInput): Promise<RefundOutput> {
    // Gerçekte PayTR iade API çağrısı gereklidir.
    return { ok: true, status: "processing", refundRef: `pt_rf_${Date.now()}` };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const body = (req as any).rawBody ? JSON.parse((req as any).rawBody.toString("utf8")) : (req.body || {});
    const verified = verifyPaytrHash(body, creds);

    // Hash doğrulanamadıysa olay processing olarak işaretlenir (upstream idempotent).
    if (!verified) {
      return {
        type: "payment.processing",
        providerRef: body?.merchant_oid ? String(body.merchant_oid) : `pt_${Date.now()}`,
        amount: body?.total_amount != null ? Number(body.total_amount) : undefined, // minor unit
        currency: "TRY",
        method: "card",
        raw: { verified, body },
      };
    }

    const success = String(body?.status || "").toLowerCase() === "success";
    return {
      type: success ? "payment.succeeded" : "payment.failed",
      providerRef: String(body?.merchant_oid || `pt_${Date.now()}`),
      amount: body?.total_amount != null ? Number(body.total_amount) : undefined, // minor unit
      currency: "TRY",
      method: "card",
      raw: { verified, body },
    };
  }
}
