// src/modules/payments/gateway/adapters/craftgate.adapter.ts
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

function verifyCraftgate(req: Request, creds: GatewayCredentials): boolean {
  try {
    const secret = (creds as any)?.secretKey || (creds as any)?.apiKey;
    const sig = String(req.headers["x-craftgate-signature"] || "");
    if (!secret || !sig) return false;
    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const mac = crypto.createHmac("sha256", String(secret)).update(raw).digest("hex");
    return mac === sig;
  } catch {
    return false;
  }
}

export class CraftgateAdapter implements GatewayAdapter {
  readonly name = "craftgate" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    const _amount = toMinorInt(input.amount);
    const _currency = normCur(input.currency);
    const ref = `cg_${Date.now()}`;
    return { providerRef: ref, hostedUrl: `https://checkout.craftgate.io/${ref}`, payload: { amount: _amount, currency: _currency } };
  }

  async capture(_input: CaptureInput): Promise<CaptureOutput> {
    return { ok: true, status: "succeeded" };
  }

  async refund(_input: RefundInput): Promise<RefundOutput> {
    return { ok: true, status: "succeeded", refundRef: `cg_rf_${Date.now()}` };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const verified = verifyCraftgate(req, creds);
    const b = (req as any).rawBody ? JSON.parse((req as any).rawBody.toString("utf8")) : (req.body || {});
    const map: Record<string, WebhookEvent["type"]> = {
      PAYMENT_SUCCEEDED: "payment.succeeded",
      PAYMENT_FAILED: "payment.failed",
      REFUND_SUCCEEDED: "refund.succeeded",
      REFUND_FAILED: "refund.failed",
    };
    const type = map[b?.eventType] || "payment.processing";

    if (!verified) {
      return {
        type: "payment.processing",
        providerRef: String(b?.paymentId || b?.transactionId || `cg_${Date.now()}`),
        amount: b?.paidPrice != null ? Math.round(Number(b.paidPrice) * 100) : undefined,
        currency: (b?.currency || "TRY").toUpperCase(),
        method: "card",
        raw: { verified, body: b },
      };
    }

    return {
      type,
      providerRef: String(b?.paymentId || b?.transactionId || `cg_${Date.now()}`),
      refundRef: b?.refundId ? String(b.refundId) : undefined,
      amount: b?.paidPrice != null ? Math.round(Number(b.paidPrice) * 100) : undefined,
      currency: (b?.currency || "TRY").toUpperCase(),
      method: "card",
      raw: { verified, body: b },
    };
  }
}
