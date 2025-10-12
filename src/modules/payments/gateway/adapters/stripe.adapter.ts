import Stripe from "stripe";
import type {
  GatewayAdapter, CreateCheckoutInput, CreateCheckoutOutput,
  CaptureInput, CaptureOutput, RefundInput, RefundOutput,
  WebhookEvent, GatewayCredentials
} from "../../types/gateway.types";
import type { Request } from "express";

/* ----------------------------- helpers ---------------------------------- */

function makeStripe(creds: GatewayCredentials) {
  const secret =
    (creds?.secretKey && String(creds.secretKey).startsWith("sk_"))
      ? String(creds.secretKey)
      : process.env.PAYMENTS_STRIPE_SECRET_KEY || "";
  if (!secret) throw new Error("stripe_secret_missing");
  return new Stripe(secret); // apiVersion: hesap default’u
}

const normCurrency = (c?: string) => String(c || "TRY").toLowerCase();

/** Minor unit’i güvenli tam sayıya çevir (cent/kuruş) */
function toMinorInt(v: unknown, field = "amount"): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${field}_invalid: numeric value required`);
  const r = Math.round(n);
  if (r <= 0) throw new Error(`${field}_invalid: must be a positive integer (minor units)`);
  return r;
}

/** TRY için savunma (asıl min kuralı BE validator’da) */
function enforceMinAmount(currency: string, amountMinor: number) {
  if (currency === "try" && amountMinor < 2500) {
    throw new Error("amount_below_minimum: TRY için minimum 2500 kuruş (≈ ₺25) kullanın.");
  }
}

/** Stripe hata mesajını geliştirici-dostu hale getir */
function mapStripeError(e: any): Error {
  const raw = (e && (e.message || e.error?.message)) ? (e.message || e.error?.message) : String(e);
  if (/must convert to at least/i.test(raw)) {
    return new Error("amount_below_minimum: Stripe toplam tutar, hesap para biriminde en az 0.50 olmalı. TRY testlerinde en az 2500 (≈ ₺25) girin.");
  }
  return new Error(raw);
}

/* ----------------------------- adapter ---------------------------------- */

export class StripeAdapter implements GatewayAdapter {
  readonly name = "stripe" as const;

  async createCheckout(
    input: CreateCheckoutInput & { ui_mode?: "embedded" | "hosted" | "elements" }
  ): Promise<CreateCheckoutOutput> {
    try {
      const stripe = makeStripe(input.credentials || {});
      const currency = normCurrency(input.currency);

      // amount & items → MINOR INT
      const amountMinor = toMinorInt(input.amount, "amount");
      enforceMinAmount(currency, amountMinor); // defence-in-depth

      const items = Array.isArray(input.items) ? input.items : [];
      const line_items =
        items.length
          ? items.map((it, idx) => ({
              price_data: {
                currency,
                product_data: { name: it?.name || `Item ${idx + 1}` },
                unit_amount: toMinorInt(it?.unitAmount, `items[${idx}].unitAmount`),
              },
              quantity: toMinorInt(it?.qty ?? 1, `items[${idx}].qty`),
            }))
          : [{
              price_data: {
                currency,
                product_data: { name: input.orderId ? `Order ${input.orderId}` : "Checkout" },
                unit_amount: amountMinor,
              },
              quantity: 1,
            }];

      const customer_email = input.customer?.email || undefined;
      const metadata = input.metadata || {};
      const returnUrl = input.returnUrl || "";
      const cancelUrl  = input.cancelUrl  || "";

      switch (input.ui_mode) {
        case "embedded": {
          const session = await stripe.checkout.sessions.create({
            ui_mode: "embedded",
            mode: "payment",
            return_url:
              returnUrl ||
              `${input.metadata?.origin || ""}/order-success?orderId=${input.orderId}&session_id={CHECKOUT_SESSION_ID}`,
            customer_email,
            currency,
            line_items,
            metadata,
            payment_method_types: ["card"],
          });

          if (!session.client_secret) throw new Error("stripe_embedded_client_secret_missing");
          return {
            providerRef: session.id,
            clientSecret: session.client_secret, // cs_...
          };
        }

        case "hosted": {
          const session = await stripe.checkout.sessions.create({
            ui_mode: "hosted",
            mode: "payment",
            success_url:
              returnUrl ||
              `${input.metadata?.origin || ""}/order-success?orderId=${input.orderId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:
              cancelUrl ||
              `${input.metadata?.origin || ""}/checkout?orderId=${input.orderId}&cancel=1`,
            customer_email,
            currency,
            line_items,
            metadata,
            payment_method_types: ["card"],
          });

          if (!session.url) throw new Error("stripe_hosted_url_missing");
          return { providerRef: session.id, hostedUrl: session.url };
        }

        case "elements":
        default: {
          const pi = await stripe.paymentIntents.create({
            amount: amountMinor,
            currency,
            automatic_payment_methods: { enabled: true },
            receipt_email: customer_email,
            metadata,
          });
          if (!pi.client_secret) throw new Error("stripe_pi_client_secret_missing");
          return { providerRef: pi.id, clientSecret: pi.client_secret }; // pi_..._secret_...
        }
      }
    } catch (e) {
      throw mapStripeError(e);
    }
  }

  async capture(input: CaptureInput): Promise<CaptureOutput> {
    const stripe = makeStripe(input.credentials || {});
    const params = input.amount ? { amount_to_capture: toMinorInt(input.amount, "amount_to_capture") } : {};
    const pi = await stripe.paymentIntents.capture(input.providerRef, params as any);
    return {
      ok: pi.status === "succeeded" || pi.status === "requires_capture",
      status: (pi.status as any),
    };
  }

  async refund(input: RefundInput): Promise<RefundOutput> {
    const stripe = makeStripe(input.credentials || {});
    const rf = await stripe.refunds.create({
      payment_intent: input.providerRef,
      amount: input.amount ? toMinorInt(input.amount, "refund.amount") : undefined,
      reason: input.reason as any,
    });
    return {
      ok: rf.status === "succeeded" || rf.status === "pending",
      status: (rf.status as any),
      refundRef: rf.id,
      raw: rf,
    };
  }

  async parseWebhook(req: Request, creds: GatewayCredentials): Promise<WebhookEvent> {
    const stripe = makeStripe(creds);
    const sig = req.headers["stripe-signature"];
    const secret = creds.webhookSecret || process.env.PAYMENTS_STRIPE_WEBHOOK_SECRET || "";

    // İmzasız mod (geliştirme/forward proxy durumları)
    if (!sig || !secret) {
      const body = (req as any).rawBody || req.body;
      const obj = body?.data?.object || {};
      return {
        type: "payment.processing",
        providerRef: obj?.payment_intent || obj?.id,
        amount: obj?.amount || obj?.amount_total,
        currency: String(obj?.currency || "TRY").toUpperCase(),
        method: "card",
        raw: body,
      };
    }

    // İmzalı doğrulama
    const event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      String(sig),
      String(secret)
    );

    const data = event.data?.object as any;
    const currency = String(data?.currency || "TRY").toUpperCase();
    const amount = data?.amount || data?.amount_total;
    let type: WebhookEvent["type"] = "payment.processing";
    let providerRef = data?.payment_intent || data?.id;

    if (event.type === "payment_intent.succeeded") type = "payment.succeeded";
    else if (event.type === "payment_intent.payment_failed") type = "payment.failed";
    else if (event.type === "charge.refunded") type = "refund.succeeded";

    return { type, providerRef, amount, currency, method: "card", raw: event };
  }
}
