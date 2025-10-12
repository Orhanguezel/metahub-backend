import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getAdapter, normalizeCreds } from "../gateway";
import type { PaymentProvider, IntentStatus } from "@/modules/payments/types/gateway.types";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { emitWebhookEvent } from "@/modules/payments/webhooks";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const isCs = (s?: string) => typeof s === "string" && s.startsWith("cs_");
const isPiSecret = (s?: string) =>
  typeof s === "string" &&
  (s.startsWith("pi_") || s.startsWith("seti_")) &&
  s.includes("_secret_");

/**
 * Adapter çıktısını normalize et:
 * - Hosted: hostedUrl varsa
 * - Embedded: clientSecret cs_… ise
 * - Elements: clientSecret pi_…_secret_… ise
 * - Hatalı eşleşme: providerRef pi_* + clientSecret cs_* → payload içinden PI secret arar
 */
function normalizeAdapterOut(out: any) {
  let hostedUrl: string | undefined = out?.hostedUrl || out?.url;
  let clientSecret: string | undefined = out?.clientSecret;
  const providerRef: string | undefined = out?.providerRef;
  const payload = out?.payload;

  // Hatalı eşleşme: PI + CS
  if (providerRef?.startsWith("pi_") && isCs(clientSecret)) {
    const guesses = [
      payload?.piClientSecret,
      payload?.paymentIntentClientSecret,
      payload?.intentClientSecret,
      payload?.intentSecret,
      out?.piClientSecret,
    ].filter(Boolean);
    const firstPi = guesses.find((g: string) => isPiSecret(g));
    clientSecret = firstPi || undefined; // yanlış cs_’yi FE’ye göndermeyelim
  }

  return { hostedUrl, clientSecret, providerRef, payload };
}

/* ------------------------------------------------------------------ */
/* POST /api/.../payments/intents/checkout                             */
/* ------------------------------------------------------------------ */
export const createCheckoutIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { PaymentGateway, Order, PaymentIntent } = await getTenantModels(req);

  const {
    provider,
    orderId,
    amount,
    currency,
    method,
    returnUrl,
    cancelUrl,
    customer,
    items,
    metadata,
    ui_mode: uiModeTop,
  } = req.body as {
    provider: PaymentProvider;
    orderId?: string;
    amount?: number; // minor unit
    currency?: string;
    method?: string;
    returnUrl?: string;
    cancelUrl?: string;
    customer?: any;
    items?: any[];
    metadata?: Record<string, any>;
    ui_mode?: "embedded" | "hosted" | "elements";
  };

  /* 1) Aktif gateway */
  const gw = await PaymentGateway.findOne({ tenant: req.tenant, provider, isActive: true });
  if (!gw) {
    res.status(400).json({ success: false, message: "payment_gateway_not_configured" });
    return;
  }

  /* 2) Tutar & para birimi (minor int + uppercase currency) */
  let amtMinor = Math.round(Number(amount || 0));
  let cur = String(currency || "TRY").toUpperCase();
  let orderDoc: any = null;

  if (orderId) {
    if (!isValidObjectId(orderId)) {
      res.status(400).json({ success: false, message: "invalid_order_id" });
      return;
    }
    orderDoc = await Order.findOne({ _id: orderId, tenant: req.tenant });
    if (!orderDoc) {
      res.status(404).json({ success: false, message: "order_not_found" });
      return;
    }
    const centsFromOrder =
      typeof orderDoc.finalTotal_cents === "number"
        ? Math.round(Number(orderDoc.finalTotal_cents))
        : Math.round(Number(orderDoc.finalTotal || 0) * 100);
    amtMinor = centsFromOrder;
    cur = String(orderDoc.currency || cur).toUpperCase();
  }

  if (!(amtMinor > 0)) {
    res.status(400).json({ success: false, message: "invalid_amount" });
    return;
  }

  /* 3) Idempotency – açık intent varsa dön */
  if (orderDoc?._id) {
    const existing = await PaymentIntent.findOne({
      tenant: req.tenant,
      order: orderDoc._id,
      provider,
      status: { $in: ["requires_action", "processing", "succeeded", "requires_payment_method"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existing) {
      if (!existing.clientSecret && !(existing as any).hostedUrl) {
        res.status(400).json({ success: false, message: "stale_intent_missing_secret_and_url" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "checkout_already_initialized",
        data: {
          intentId: String(existing._id),
          providerRef: existing.providerRef,
          clientSecret: existing.clientSecret,
          hostedUrl: (existing as any).hostedUrl,
          payload: undefined,
          currency: existing.currency,
          amount: existing.amount,
          status: existing.status,
          uiMode: (existing as any).uiMode, // 👈 eklendi
        },
      });
      return;
    }
  }

  /* 4) Adapter çağrısı */
  const adapter = getAdapter(provider);
  const defaultMethod = (provider === "papara" || provider === "paycell") ? "wallet" : "card";
  const chosenMethod = (method as any) || defaultMethod;

  // metadata > ui_mode alanlarını birleştir
  const resolvedUiMode: "embedded" | "hosted" | "elements" | undefined =
    uiModeTop || (metadata?.ui_mode as any) || undefined;

  const out = await adapter.createCheckout({
    tenant: req.tenant!,
    provider,
    method: chosenMethod,
    amount: amtMinor,
    currency: cur,
    orderId,
    customer,
    items,
    returnUrl,
    cancelUrl,
    metadata,
    ui_mode: resolvedUiMode,
    locale: (req as any).locale || "tr-TR",
    credentials: normalizeCreds((gw as any).credentials),
  });

  const { hostedUrl, clientSecret, providerRef, payload } = normalizeAdapterOut(out);

  // 👇 BE hiçbir şey üretmediyse açık hata dön
  if (!hostedUrl && !clientSecret) {
    res.status(400).json({ success: false, message: "no_client_secret_or_hosted_url" });
    return;
  }

  /* 5) Başlangıç durumu */
  let initialStatus: IntentStatus = "requires_payment_method";
  if (hostedUrl || isCs(clientSecret)) {
    initialStatus = "requires_action";              // hosted veya embedded
  } else if (isPiSecret(clientSecret)) {
    initialStatus = "requires_payment_method";      // elements – kart bilgisi girilecek
  }

  /* 6) Intent kaydı */
  const intent = await (await getTenantModels(req)).PaymentIntent.create({
    tenant: req.tenant,
    order: orderDoc?._id,
    provider,
    providerRef,
    method: chosenMethod,
    amount: amtMinor,
    currency: cur,
    status: initialStatus,
    clientSecret: clientSecret,
    hostedUrl: hostedUrl,
    metadata,
    createdBy: (req as any).user?._id,
    uiMode: resolvedUiMode,                          // 👈 eklendi
  });

  res.status(201).json({
    success: true,
    message: "checkout_initialized",
    data: {
      intentId: String(intent._id),
      providerRef,
      clientSecret,
      hostedUrl,
      payload,
      currency: cur,
      amount: amtMinor,
      status: intent.status,
      uiMode: resolvedUiMode,                        // 👈 eklendi
    },
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/.../payments/intents/webhooks/:provider                   */
/* ------------------------------------------------------------------ */
export const handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { provider } = req.params as { provider: PaymentProvider };
  const { PaymentGateway, Payment, Order, PaymentIntent, Refund } = await getTenantModels(req);

  const gw = await PaymentGateway.findOne({ tenant: req.tenant, provider, isActive: true }).lean();
  if (!gw) {
    res.status(400).json({ success: false, message: "payment_gateway_not_configured" });
    return;
  }

  const adapter = getAdapter(provider);
  const evt = await adapter.parseWebhook(req, normalizeCreds((gw as any).credentials));

  // --- REFUND olayları ---
  if (evt.type === "refund.succeeded" || evt.type === "refund.failed") {
    const status = evt.type === "refund.succeeded" ? "succeeded" : "failed";
    const amt = Number(evt.amount ?? 0);
    const cur = String(evt.currency || "TRY").toUpperCase();

    const existing = await (await getTenantModels(req)).Refund.findOne({
      tenant: req.tenant,
      provider,
      paymentProviderRef: evt.providerRef,
      status: { $in: ["pending", "failed"] },
      ...(amt > 0 ? { amount_cents: amt } : {}),
    });

    let orderId: any;
    let orderNo: string | undefined;

    const intentForRefund = await PaymentIntent.findOne({
      tenant: req.tenant,
      provider,
      providerRef: evt.providerRef,
    }).lean();

    if (intentForRefund?.order && isValidObjectId(String(intentForRefund.order))) {
      const ord = await Order.findOne({ _id: intentForRefund.order, tenant: req.tenant })
        .select("_id orderNo currency")
        .lean();
      orderId = ord?._id;
      orderNo = ord?.orderNo;
    }

    if (existing) {
      existing.status = status;
      existing.currency = cur;
      (existing as any).raw = evt.raw;
      if (!existing.order && orderId) existing.order = orderId;
      if (!existing.orderNo && orderNo) existing.orderNo = orderNo!;
      if (evt.refundRef) existing.providerRefundId = evt.refundRef;
      await existing.save();

      await emitWebhookEvent(req, "refund.updated", {
        refundId: String(existing._id),
        orderId: existing.order ? String(existing.order) : undefined,
        provider,
        paymentProviderRef: evt.providerRef,
        providerRefundId: evt.refundRef,
        amount_minor: existing.amount_cents,
        currency: existing.currency,
        status,
      });
    } else if (orderId && orderNo) {
      const created = await (await getTenantModels(req)).Refund.create({
        tenant: req.tenant,
        order: orderId,
        orderNo,
        provider,
        status,
        amount_cents: amt,
        currency: cur,
        reason: (evt as any).reason,
        paymentProviderRef: evt.providerRef,
        providerRefundId: evt.refundRef,
        raw: evt.raw,
      });

      await emitWebhookEvent(req, "refund.created", {
        refundId: String(created._id),
        orderId: String(orderId),
        provider,
        paymentProviderRef: evt.providerRef,
        providerRefundId: evt.refundRef,
        amount_minor: amt,
        currency: cur,
        status,
      });
    }

    res.status(200).json({ ok: true });
    return;
  }

  // --- PAYMENT olayları ---
  const intent = await PaymentIntent.findOne({
    tenant: req.tenant,
    provider,
    providerRef: evt.providerRef,
  });

  if (!intent) {
    res.status(200).json({ ok: true }); // idempotent
    return;
  }

  if (evt.type === "payment.succeeded") intent.status = "succeeded";
  else if (evt.type === "payment.failed") intent.status = "failed";
  else if (evt.type === "payment.canceled") intent.status = "canceled";
  else if (evt.type === "payment.processing") intent.status = "processing";
  await intent.save();

  if (evt.type === "payment.succeeded") {
    const minor = Number(evt.amount ?? intent.amount ?? 0);
    const grossMajor = minor / 100;

    const existingPayment = await (await getTenantModels(req)).Payment.findOne({
      tenant: req.tenant,
      provider,
      providerRef: evt.providerRef,
      kind: "payment",
    }).lean();

    let paymentDoc: any = existingPayment;
    if (!existingPayment) {
      paymentDoc = await (await getTenantModels(req)).Payment.create({
        tenant: req.tenant,
        code: "",
        kind: "payment",
        status: "confirmed",
        method: (evt as any).method || intent.method || "card",
        provider,
        providerRef: evt.providerRef,
        grossAmount: grossMajor,
        currency: String((evt.currency || intent.currency || "TRY")).toUpperCase(),
        fees: [],
        receivedAt: new Date(),
        payer: {},
        instrument: { type: ((evt as any).method || intent.method || "card") as any },
        links: { order: intent.order },
        metadata: { webhook: evt.raw },
      });

      await emitWebhookEvent(req, "payment.created", {
        paymentId: String(paymentDoc._id),
        orderId: intent.order ? String(intent.order) : undefined,
        provider,
        providerRef: evt.providerRef,
        amount_minor: minor,
        currency: String(evt.currency || intent.currency).toUpperCase(),
        method: (evt as any).method || intent.method || "card",
        status: "confirmed",
      });
    }

    if (intent.order && isValidObjectId(String(intent.order))) {
      try {
        const order = await (await getTenantModels(req)).Order.findOne({ _id: intent.order, tenant: req.tenant });
        if (order) {
          (order as any).isPaid = true;
          (order as any).payments = [ ...((order as any).payments || []), paymentDoc._id ];
          await order.save();
        }
      } catch { /* noop */ }
    }
  }

  res.status(200).json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* POST /api/.../payments/intents/capture                              */
/* ------------------------------------------------------------------ */
export const capturePayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { provider, providerRef, amount } = req.body as {
    provider: PaymentProvider;
    providerRef: string;
    amount?: number; // minor unit
  };
  const { PaymentGateway } = await getTenantModels(req);

  const gw = await PaymentGateway.findOne({ tenant: req.tenant, provider, isActive: true }).lean();
  if (!gw) {
    res.status(400).json({ success: false, message: "payment_gateway_not_configured" });
    return;
  }

  const adapter = getAdapter(provider);
  const out = await adapter.capture({
    tenant: req.tenant!,
    provider,
    providerRef,
    amount,
    credentials: normalizeCreds((gw as any).credentials),
  });

  res.status(200).json({ success: out.ok, data: out });
});

/* ------------------------------------------------------------------ */
/* POST /api/.../payments/intents/refund/provider                      */
/* ------------------------------------------------------------------ */
export const providerRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { provider, providerRef, amount, reason } = req.body as {
    provider: PaymentProvider;
    providerRef: string;
    amount?: number; // minor unit
    reason?: string;
  };
  const { PaymentGateway } = await getTenantModels(req);

  const gw = await PaymentGateway.findOne({ tenant: req.tenant, provider, isActive: true }).lean();
  if (!gw) {
    res.status(400).json({ success: false, message: "payment_gateway_not_configured" });
    return;
  }

  const adapter = getAdapter(provider);
  const out = await adapter.refund({
    tenant: req.tenant!,
    provider,
    providerRef,
    amount,
    reason,
    credentials: normalizeCreds((gw as any).credentials),
  });

  res.status(200).json({ success: out.ok, data: out });
});
