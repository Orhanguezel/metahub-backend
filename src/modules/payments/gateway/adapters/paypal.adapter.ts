// src/modules/payments/gateway/adapters/paypal.adapter.ts
import type {
  GatewayAdapter, CreateCheckoutInput, CreateCheckoutOutput,
  CaptureInput, CaptureOutput, RefundInput, RefundOutput,
  WebhookEvent, GatewayCredentials
} from "../../types/gateway.types";
import type { Request } from "express";
import crypto from "crypto";

/* ---------------- helpers ---------------- */
const normCur = (c?: string) => String(c || "USD").toUpperCase();
const toMinorInt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("amount_invalid");
  const r = Math.round(n);
  if (r <= 0) throw new Error("amount_invalid_positive");
  return r;
};

/* Basit PayPal webhook doğrulama placeholder:
   Gerçekte PayPal Webhook Verification API (v2) ile 'transmission_id', 'transmission_sig',
   'transmission_time', 'webhook_id', 'cert_url', 'auth_algo' alanları doğrulanır.
   Burada creds.webhookSecret varsa ve body+time ile HMAC eşlemesi gönderildiyse kontrol edilir. */
function verifyPaypal(req: Request, creds: GatewayCredentials): boolean {
  try {
    const secret = (creds as any)?.webhookSecret;
    const sig = String(req.headers["paypal-transmission-sig"] || "");
    const time = String(req.headers["paypal-transmission-time"] || "");
    if (!secret || !sig || !time) return false;
    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const mac = crypto.createHmac("sha256", String(secret)).update(time).update(raw).digest("base64");
    return mac === sig;
  } catch {
    return false;
  }
}

export class PaypalAdapter implements GatewayAdapter {
  readonly name = "paypal" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    const _amount = toMinorInt(input.amount);
    const _currency = normCur(input.currency);
    const providerRef = `pp_${Date.now()}`;
    return { providerRef, hostedUrl: `https://paypal.mock/approve/${providerRef}`, payload: { amount: _amount, currency: _currency } };
  }

  async capture(_input: CaptureInput): Promise<CaptureOutput> {
    return { ok: true, status: "succeeded" };
  }

  async refund(_input: RefundInput): Promise<RefundOutput> {
    return { ok: true, status: "succeeded", refundRef: `pp_rf_${Date.now()}` };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const verified = verifyPaypal(req, creds);
    const b = (req as any).rawBody ? JSON.parse((req as any).rawBody.toString("utf8")) : (req.body || {});
    const et = String(b?.event_type || "").toUpperCase();

    // Refund olayları
    if (et === "PAYMENT.SALE.REFUNDED" || et === "PAYMENT.CAPTURE.REFUNDED") {
      const amountMajor = Number(b?.resource?.amount?.total || b?.resource?.amount?.value || 0);
      const currency = (b?.resource?.amount?.currency || b?.resource?.amount?.currency_code || "USD").toUpperCase();
      return {
        type: "refund.succeeded",
        providerRef: String(b?.resource?.sale_id || b?.resource?.capture_id || b?.resource?.parent_payment || "pp_tx"),
        refundRef: String(b?.resource?.id || `pp_rf_${Date.now()}`),
        amount: Math.round(amountMajor * 100),
        currency,
        method: "card",
        raw: { verified, body: b },
      };
    }

    // Ödeme olayları
    const amountMajor = Number(b?.resource?.amount?.value || b?.resource?.amount?.total || 0);
    const currency = (b?.resource?.amount?.currency || b?.resource?.amount?.currency_code || "USD").toUpperCase();

    // İmza yoksa/başarısızsa processing döndür
    if (!verified) {
      return {
        type: "payment.processing",
        providerRef: String(b?.resource?.id || "pp_tx"),
        amount: Math.round(amountMajor * 100),
        currency,
        method: "card",
        raw: { verified, body: b },
      };
    }

    return {
      type: et.endsWith(".COMPLETED") ? "payment.succeeded" : "payment.processing",
      providerRef: String(b?.resource?.id || "pp_tx"),
      amount: Math.round(amountMajor * 100),
      currency,
      method: "card",
      raw: { verified, body: b },
    };
  }
}
