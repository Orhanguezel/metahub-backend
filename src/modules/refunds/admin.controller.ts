import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getAdapter, normalizeCreds } from "@/modules/payments/gateway";
import { isValidObjectId } from "mongoose";

/**
 * POST /refunds/admin/orders/:orderRef/refunds
 * Body: { amount_cents, reason? }
 * orderRef: orderNo veya Order._id (ObjectId)
 */
export const createRefundForOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderRef } = req.params as { orderRef: string };
  const { amount_cents, reason } = req.body as { amount_cents: number; reason?: string };

  const { Order, Payment, PaymentGateway, Refund } = await getTenantModels(req);

  // 1) Order'ı bul (orderNo veya _id)
  const orderFilter: any = { tenant: (req as any).tenant };
  if (isValidObjectId(orderRef)) {
    orderFilter.$or = [{ _id: orderRef }, { orderNo: orderRef }];
  } else {
    orderFilter.orderNo = orderRef;
  }

  const order = await Order.findOne(orderFilter).select("_id orderNo currency").lean();
  if (!order) {
    res.status(404).json({ success: false, message: "order_not_found" });
    return;
  }

  // 2) En güncel onaylı ödeme — geniş kapsamlı arama
  const statusAllow = ["confirmed", "paid", "succeeded", "captured", "completed", "authorized"];

  const payments = await Payment.find({
    tenant: (req as any).tenant,
    status: { $in: statusAllow },
    $or: [
      { "links.order": order._id },
      { "links.orders": order._id },
      { "links.orderId": order._id },
      { order: order._id },
      { orderId: order._id },
      { orderNo: order.orderNo },
      { "links.orderNo": order.orderNo },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // provider + providerRef barındıran ilk kaydı seç
  const payment = payments.find((p: any) => p?.provider && p?.providerRef);
  if (!payment) {
    res.status(400).json({
      success: false,
      message: "no_confirmed_payment_for_order",
    });
    return;
  }

  const provider = String((payment as any).provider || "").toLowerCase();
  const providerRef = (payment as any).providerRef;
  if (!provider || !providerRef) {
    res.status(400).json({ success: false, message: "payment_missing_provider_ref" });
    return;
  }

  // 3) Aktif ödeme geçidi
  const gw = await PaymentGateway.findOne({ tenant: (req as any).tenant, provider, isActive: true }).lean();
  if (!gw) {
    res.status(400).json({ success: false, message: "payment_gateway_not_configured" });
    return;
  }

  // 4) Miktar normalize
  const amt = Math.max(1, Math.round(Number(amount_cents || 0)));

  // 5) Gateway refund çağrısı (minor units)
  const adapter = getAdapter(provider as any);
  const out = await adapter.refund({
    tenant: (req as any).tenant!,
    provider: provider as any,
    providerRef,
    amount: amt,
    reason,
    credentials: normalizeCreds((gw as any).credentials),
  });

  // 6) Refund kaydı (çoğu sağlayıcı async finalize eder → pending)
  const currency = String((order as any).currency || (payment as any).currency || "TRY").toUpperCase();

  const doc = await Refund.create({
    tenant: (req as any).tenant,
    order: order._id,
    orderNo: order.orderNo,
    provider,
    status: out?.ok ? "pending" : "failed",
    amount_cents: amt,
    currency,
    reason,
    paymentProviderRef: providerRef,
    providerRefundId: (out as any)?.refundId,
    raw: out,
  });

  res.status(201).json({ success: true, message: "refund_initiated", data: doc });
});

/**
 * GET /refunds/admin/refunds?status=&q=&from=&to=&page=&limit=
 * q: orderNo | providerRefundId | paymentProviderRef | refund _id | order _id
 */
export const listRefunds = asyncHandler(async (req: Request, res: Response) => {
  const { Refund } = await getTenantModels(req);
  const { status, q, from, to, page = "1", limit = "20" } = req.query as Record<string, string>;

  const filter: any = { tenant: (req as any).tenant };
  if (status) filter.status = status;

  if (q) {
    const s = String(q).trim();
    const ors: any[] = [
      { orderNo: { $regex: s, $options: "i" } },
      { providerRefundId: s },
      { paymentProviderRef: s },
    ];
    if (isValidObjectId(s)) {
      ors.push({ _id: s });
      ors.push({ order: s });
    }
    filter.$or = ors;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const lm = Math.min(500, Math.max(1, parseInt(limit, 10) || 20));
  const [items, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm).lean(),
    Refund.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, message: "list_fetched", data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /refunds/admin/refunds/:id */
export const getRefundById = asyncHandler(async (req: Request, res: Response) => {
  const { Refund } = await getTenantModels(req);
  const doc = await Refund.findOne({ _id: req.params.id, tenant: (req as any).tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: "not_found" });
    return;
  }
  res.status(200).json({ success: true, data: doc });
});

/** PUT /refunds/admin/refunds/:id  (allowed: status, reason, raw) */
export const updateRefund = asyncHandler(async (req: Request, res: Response) => {
  const { Refund } = await getTenantModels(req);
  const doc = await Refund.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: "not_found" });
    return;
  }

  const { status, reason, raw } = req.body as {
    status?: "pending" | "succeeded" | "failed";
    reason?: string;
    raw?: any;
  };

  if (status !== undefined) (doc as any).status = status;
  if (reason !== undefined) (doc as any).reason = reason;
  if (raw !== undefined) (doc as any).raw = raw;

  await (doc as any).save();
  res.status(200).json({ success: true, message: "updated", data: doc.toJSON() });
});

/** DELETE /refunds/admin/refunds/:id */
export const deleteRefund = asyncHandler(async (req: Request, res: Response) => {
  const { Refund } = await getTenantModels(req);
  const doc = await Refund.findOne({ _id: req.params.id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: "not_found" });
    return;
  }
  await (doc as any).deleteOne();
  res.status(200).json({ success: true, message: "deleted" });
});
