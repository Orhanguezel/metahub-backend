// src/modules/payments/gateway/adapters/papara.adapter.ts
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

function verifyPapara(req: Request, creds: GatewayCredentials): boolean {
  try {
    const secret = (creds as any)?.apiKey || (creds as any)?.clientSecret;
    const sig = String(req.headers["x-papara-signature"] || "");
    if (!secret || !sig) return false;
    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const mac = crypto.createHmac("sha256", String(secret)).update(raw).digest("hex");
    return mac === sig;
  } catch {
    return false;
  }
}

export class PaparaAdapter implements GatewayAdapter {
  readonly name = "papara" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    const _amount = toMinorInt(input.amount);
    const _currency = normCur(input.currency);
    const ref = `pa_${Date.now()}`;
    return {
      providerRef: ref,
      hostedUrl: `https://papara.mock/pay/${ref}`,
      payload: { method: "wallet", amount: _amount, currency: _currency }
    };
  }

  async capture(_input: CaptureInput): Promise<CaptureOutput> {
    return { ok: true, status: "succeeded" };
  }

  async refund(_input: RefundInput): Promise<RefundOutput> {
    return { ok: true, status: "succeeded", refundRef: `pa_rf_${Date.now()}` };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const verified = verifyPapara(req, creds);
    const b = (req as any).rawBody ? JSON.parse((req as any).rawBody.toString("utf8")) : (req.body || {});
    const map: Record<string, WebhookEvent["type"]> = {
      PAYMENT_SUCCEEDED: "payment.succeeded",
      PAYMENT_FAILED: "payment.failed",
      REFUND_SUCCEEDED: "refund.succeeded",
      REFUND_FAILED: "refund.failed",
    };
    const ev = map[b?.event] || (b?.status === "success" ? "payment.succeeded" : "payment.failed");

    if (!verified) {
      return {
        type: "payment.processing",
        providerRef: String(b?.transactionId || b?.paymentId || `pa_${Date.now()}`),
        amount: b?.amount != null ? Math.round(Number(b.amount) * 100) : undefined,
        currency: (b?.currency || "TRY").toUpperCase(),
        method: "wallet",
        raw: { verified, body: b },
      };
    }

    return {
      type: ev,
      providerRef: String(b?.transactionId || b?.paymentId || `pa_${Date.now()}`),
      refundRef: b?.refundId ? String(b.refundId) : undefined,
      amount: b?.amount != null ? Math.round(Number(b.amount) * 100) : undefined, // TL→kuruş
      currency: (b?.currency || "TRY").toUpperCase(),
      method: "wallet",
      raw: { verified, body: b },
    };
  }
}
