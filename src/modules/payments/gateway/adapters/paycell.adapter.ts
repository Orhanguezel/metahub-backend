// src/modules/payments/gateway/adapters/paycell.adapter.ts
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

function verifyPaycell(req: Request, creds: GatewayCredentials): boolean {
  try {
    const secret = (creds as any)?.apiKey || (creds as any)?.clientSecret;
    const sig = String(req.headers["x-paycell-signature"] || "");
    if (!secret || !sig) return false;
    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const mac = crypto.createHmac("sha256", String(secret)).update(raw).digest("hex");
    return mac === sig;
  } catch {
    return false;
  }
}

export class PaycellAdapter implements GatewayAdapter {
  readonly name = "paycell" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    const _amount = toMinorInt(input.amount);
    const _currency = normCur(input.currency);
    const ref = `pc_${Date.now()}`;
    return {
      providerRef: ref,
      hostedUrl: `https://paycell.mock/pay/${ref}`,
      payload: { method: "wallet", amount: _amount, currency: _currency }
    };
  }

  async capture(_input: CaptureInput): Promise<CaptureOutput> {
    return { ok: true, status: "succeeded" };
  }

  async refund(_input: RefundInput): Promise<RefundOutput> {
    return { ok: true, status: "processing", refundRef: `pc_rf_${Date.now()}` };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const verified = verifyPaycell(req, creds);
    const b = (req as any).rawBody ? JSON.parse((req as any).rawBody.toString("utf8")) : (req.body || {});
    const isRefund = b?.eventType === "REFUND_SUCCEEDED" || b?.eventType === "REFUND_FAILED";
    const type =
      b?.eventType === "REFUND_SUCCEEDED" ? "refund.succeeded" :
      b?.eventType === "REFUND_FAILED"   ? "refund.failed" :
      ((b?.result?.code === "0" || b?.status === "SUCCESS") ? "payment.succeeded" : "payment.failed");

    if (!verified) {
      return {
        type: "payment.processing",
        providerRef: String(b?.transactionId || b?.paymentId || `pc_${Date.now()}`),
        amount: b?.amount != null ? Number(b.amount) : undefined, // çoğu zaman minor unit
        currency: (b?.currency || "TRY").toUpperCase(),
        method: "wallet",
        raw: { verified, body: b },
      };
    }

    return {
      type,
      providerRef: String(b?.transactionId || b?.paymentId || `pc_${Date.now()}`),
      refundRef: isRefund ? (String(b?.refundId || "") || undefined) : undefined,
      amount: b?.amount != null ? Number(b.amount) : undefined,
      currency: (b?.currency || "TRY").toUpperCase(),
      method: "wallet",
      raw: { verified, body: b },
    };
  }
}
