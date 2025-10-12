
// src/modules/order/admin.order.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/orders/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { sendEmail } from "@/services/emailService";
// (ops) stok rezervasyon/serbest bırakma servisleri:
// import { releaseReservationsForOrder } from "@/modules/inventory/reservations.service";

const validStatuses = ["pending", "preparing", "shipped", "completed", "cancelled"] as const;
function orderT(key: string, locale: SupportedLocale, vars?: Record<string, string | number>) {
  return t(key, locale, orderTranslations, vars);
}
function isPopulatedUser(user: any): user is { _id: any; email?: string; name?: string } {
  return user && typeof user === "object" && "email" in user;
}

/* -------------------- LIST (paginated) -------------------- */
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { lang, serviceType, status, q, from, to, page = "1", limit = "20" } =
    req.query as Record<string, string>;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();

  const filter: any = { tenant: req.tenant };
  if (lang) filter.language = lang;
  if (serviceType) filter.serviceType = serviceType;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    filter.$or = [
      { orderNo: { $regex: q, $options: "i" } },
      { "shippingAddress.name": { $regex: q, $options: "i" } },
      { "payment.externalId": { $regex: q, $options: "i" } },
    ];
  }

  const p = Math.max(1, parseInt(String(page), 10) || 1);
  const l = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (p - 1) * l;

  const { Order } = await getTenantModels(req);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .populate("branch", "code name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: orderT("order.fetched.all", locale),
    data: items,
    meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
  });
});

/* -------------------- GET by orderNo -------------------- */
// admin.order.controller.ts → getOrderByNo
export const getOrderByNo = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { Order } = await getTenantModels(req);

  const param = String(req.params.orderNo).trim();
  const maybeNum = Number(param);
  const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(param);

  const q: any = { tenant: req.tenant, $or: [{ orderNo: param }] };
  if (!Number.isNaN(maybeNum)) q.$or.push({ orderNo: maybeNum });
  if (looksLikeObjectId) q.$or.push({ _id: param });

  const doc = await Order.findOne(q)
    .populate("user", "name email")
    .populate("items.product")
    .populate("branch", "code name");

  if (!doc) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return; // ✅ Response döndürme, sadece return;
  }

  res.status(200).json({ success: true, message: orderT("order.fetched.one", locale), data: doc });
  return; // ✅
});




/* -------------------- CANCEL (packing öncesi) -------------------- */
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = (req.body || {}) as { reason?: string };
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { Order /*, Stockledger */ } = await getTenantModels(req);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant }).populate("user", "email name");
  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }

  // Yalnızca 'pending' veya 'preparing' aşamasında iptal edelim
  if (!["pending", "preparing"].includes(order.status as string)) {
    res.status(409).json({
      success: false,
      message: orderT("error.cannotCancelStage", locale),
    });
    return;
  }
  // Ödenmiş kart/PayPal sipariş iptal edilemez (refund akışıyla olmalı)
  const paying = ["credit_card", "paypal"].includes(order.paymentMethod as string);
  if (paying && order.isPaid) {
    res.status(409).json({
      success: false,
      message: orderT("error.cannotCancelPaidOrder", locale),
    });
    return;
  }

  const prev = order.status;
  order.status = "cancelled";

  (order as any).timeline = Array.isArray((order as any).timeline) ? (order as any).timeline : [];
  (order as any).timeline.push({
    at: new Date(),
    ev: "ORDER_CANCELLED",
    by: String((req as any).user?._id || "system"),
    meta: { from: prev, to: "cancelled", reason: reason || null },
  });

  // (Ops.) rezervasyon serbest bırakma — stok politikana bağlı:
  // try { await releaseReservationsForOrder({ tenant: req.tenant!, orderId: String(order._id) }); } catch {}

  await order.save();

  res.status(200).json({
    success: true,
    message: orderT("order.cancelled.success", locale),
    data: order,
  });
});

/* -------------------- NOTE (timeline notu) -------------------- */
export const addOrderNote = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { text } = (req.body || {}) as { text: string };
  const { Order } = await getTenantModels(req);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }

  (order as any).timeline = Array.isArray((order as any).timeline) ? (order as any).timeline : [];
  (order as any).timeline.push({
    at: new Date(),
    ev: "NOTE",
    by: String((req as any).user?._id || "system"),
    meta: { text },
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: orderT("order.note.added", locale),
    data: order,
  });
});


async function maybeSendStatusEmail(
  req: Request,
  to: string | undefined,
  locale: SupportedLocale,
  opts: { orderId: string; newStatus?: string; subjectKey?: string; bodyKey?: string }
) {
  if (!to) return;
  const tenantData = (req as any).tenantData || {};
  const brandName =
    tenantData?.name?.[locale] || tenantData?.name?.[("en" as SupportedLocale)] || tenantData?.name || "Brand";
  const brandWebsite =
    (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ||
    process.env.BRAND_WEBSITE;
  const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

  const subject =
    orderT(opts.subjectKey || "email.statusUpdateSubject", locale, { id: opts.orderId, brand: brandName }) ||
    `Order #${opts.orderId} status update`;

  const body =
    `<h2>${orderT("email.statusUpdateTitle", locale, { brand: brandName })}</h2>` +
    `<p>${orderT("order.status.updated", locale)}</p>` +
    (opts.newStatus ? `<p><strong>${orderT("labelNewStatus", locale)}:</strong> ${orderT(`order.status.${opts.newStatus}`, locale)}</p>` : "") +
    `<p><strong>ID:</strong> ${opts.orderId}</p>`;

  try {
    await sendEmail({
      tenantSlug: req.tenant,
      to,
      subject,
      html: body,
      from: senderEmail,
    });
  } catch {
    // mail hatası akışı bozmasın
  }
}

/* -------------------- LIST -------------------- */
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { lang, serviceType, status } = req.query as Record<string, string>;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();

  const filter: any = { tenant: req.tenant };
  if (lang) filter.language = lang;
  if (serviceType) filter.serviceType = serviceType;
  if (status) filter.status = status;

  const { Order } = await getTenantModels(req);

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("items.product")
    .populate("branch", "code name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: orderT("order.fetched.all", locale),
    data: orders,
  });
  return;
});

/* --------------- UPDATE STATUS ---------------- */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: nextStatus } = req.body as { status: typeof validStatuses[number] };
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();

  if (!validStatuses.includes(nextStatus)) {
    res.status(400).json({ success: false, message: orderT("error.invalidOrderStatus", locale) });
    return;
  }

  const { Order, Notification } = await getTenantModels(req);

  // Önce mevcut order'ı status kuralları için alalım (validation tetiklemez)
  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant })
    .populate("user", "name email")
    .populate("items.product")
    .lean(); // <- lean ile plain object

  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }

  const current = order.status as typeof validStatuses[number];
  const allowed: Record<typeof validStatuses[number], Array<typeof validStatuses[number]>> = {
    pending: ["preparing", "cancelled"],
    preparing: ["shipped", "cancelled"],
    shipped: ["completed"],
    completed: [],
    cancelled: [],
  };

  const canGo = allowed[current]?.includes(nextStatus) ?? false;
  if (!canGo) {
    res.status(409).json({ success: false, message: orderT("error.invalidTransition", locale) });
    return;
  }

  // İş kuralları
  if (nextStatus === "completed") {
    const paying = ["credit_card", "paypal"].includes(order.paymentMethod as string);
    if (paying && !order.isPaid) {
      res.status(409).json({ success: false, message: orderT("error.cannotCompleteUnpaid", locale) });
      return;
    }
  }
  if (nextStatus === "cancelled") {
    const paying = ["credit_card", "paypal"].includes(order.paymentMethod as string);
    if (paying && order.isPaid) {
      res.status(409).json({ success: false, message: orderT("error.cannotCancelPaidOrder", locale) });
      return;
    }
  }

  const now = new Date();
  const by = String((req as any).user?._id || "system");
  const updates: any = {
    status: nextStatus,
    // completed'a geçerken teslim alanlarını da set et
    ...(nextStatus === "completed" ? { isDelivered: true, deliveredAt: now } : {}),
  };

  // timeline push dokümanı
  const timelineEntry = {
    at: now,
    ev: "STATUS_UPDATED",
    by,
    meta: { from: current, to: nextStatus },
  };

  // Atomik update: yalnızca gerekli alanlara dokun, runValidators kapalı
  const updated = await Order.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenant },
    { $set: updates, $push: { timeline: timelineEntry } },
    { new: true, runValidators: false } // ❗ kritik: required alanlar yüzünden patlamasın
  )
    .populate("user", "name email")
    .populate("items.product");

  // Güvenlik
  if (!updated) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }

  // Bildirim/eposta (opsiyonel)
  if (isPopulatedUser(updated.user)) {
    await Notification.create({
      user: (updated.user as any)._id,
      tenant: req.tenant,
      type: "success",
      message: orderT(`order.status.${nextStatus}`, locale),
      data: { orderId: updated._id, newStatus: nextStatus },
      language: locale,
    }).catch(() => { });
    await maybeSendStatusEmail(req, (updated.user as any).email, locale, {
      orderId: String(updated._id),
      newStatus: nextStatus,
      subjectKey: "email.statusUpdateSubject",
    }).catch(() => { });
  }

  res.status(200).json({ success: true, message: orderT("order.status.updated", locale), data: updated });
  return;
});


/* -------- MARK AS DELIVERED (GUARDS) --------- */
export const markOrderAsDelivered = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { Order, Notification } = await getTenantModels(req);

  // Guardlar için önce mevcut kayıt (lean)
  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant })
    .populate("user", "name email")
    .populate("items.product")
    .lean();

  if (!order) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }
  if (order.status === "cancelled") {
    res.status(409).json({ success: false, message: orderT("error.cannotDeliverCancelled", locale) });
    return;
  }
  const paying = ["credit_card", "paypal"].includes(order.paymentMethod as string);
  if (paying && !order.isPaid) {
    res.status(409).json({ success: false, message: orderT("error.cannotDeliverUnpaid", locale) });
    return;
  }

  const now = new Date();
  const by = String((req as any).user?._id || "system");

  const updated = await Order.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenant },
    {
      $set: { isDelivered: true, deliveredAt: now, status: "completed" },
      $push: {
        timeline: {
          at: now,
          ev: "ORDER_MARKED_DELIVERED",
          by,
          meta: { from: order.status, to: "completed" },
        },
      },
    },
    { new: true, runValidators: false } // ❗
  )
    .populate("user", "name email")
    .populate("items.product");

  if (!updated) {
    res.status(404).json({ success: false, message: orderT("error.orderNotFound", locale) });
    return;
  }

  if (isPopulatedUser(updated.user)) {
    await Notification.create({
      user: (updated.user as any)._id,
      tenant: req.tenant,
      type: "success",
      message: orderT("order.delivered", locale),
      data: { orderId: updated._id },
      language: locale,
    }).catch(() => { });
    await maybeSendStatusEmail(req, (updated.user as any).email, locale, {
      orderId: String(updated._id),
      newStatus: "completed",
      subjectKey: "email.statusUpdateSubject",
    }).catch(() => { });
  }

  res.status(200).json({ success: true, message: orderT("order.delivered.success", locale), data: updated });
  return;
});


/* -------------------- DELETE ------------------ */
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const { Order } = await getTenantModels(req);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });

  if (!order) {
    res.status(404).json({
      success: false,
      message: orderT("error.orderNotFound", locale),
    });
    return;
  }

  // ❗ Yalnızca pending|cancelled ve ödenmemiş siparişler sert silinebilir
  const deletableStatuses = new Set(["pending", "cancelled"]);
  const canHardDelete = deletableStatuses.has(order.status as string) && !order.isPaid;

  if (!canHardDelete) {
    res.status(409).json({
      success: false,
      message: orderT("error.cannotDeleteOrderActive", locale),
    });
    return;
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: orderT("order.deleted.success", locale),
  });
  return;
});
