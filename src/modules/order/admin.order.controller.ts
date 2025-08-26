import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

const validStatuses = ["pending","preparing","shipped","completed","cancelled"] as const;

function orderT(key: string, locale: SupportedLocale, vars?: Record<string, string | number>) {
  return t(key, locale, orderTranslations, vars);
}

function isPopulatedUser(
  user: any
): user is { _id: any; email?: string; name?: string } {
  return user && typeof user === "object" && "email" in user;
}

// --- TÜM SİPARİŞLERİ GETİR ---
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
});

// --- SİPARİŞ DURUMU GÜNCELLE ---
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const locale: SupportedLocale = req.locale || getLogLocale();

  if (!validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      message: orderT("error.invalidOrderStatus", locale),
    });
    return;
  }
  const { Order, Notification } = await getTenantModels(req);

  const order = await Order.findOne({
    _id: req.params.id,
    tenant: req.tenant,
  })
    .populate("user", "name email")
    .populate("items.product");

  if (!order) {
    res.status(404).json({
      success: false,
      message: orderT("error.orderNotFound", locale),
    });
    return;
  }

  order.status = status;
  await order.save();

  // Her zaman locale kullan (user.language yok!)
  if (isPopulatedUser(order.user)) {
    await Notification.create({
      user: order.user._id,
      tenant: req.tenant,
      type: "success",
      message: orderT(`order.status.${status}`, locale),
      data: { orderId: order._id, newStatus: status },
      language: locale,
    });
  }

  res.status(200).json({
    success: true,
    message: orderT("order.status.updated", locale),
    data: order,
  });
});

// --- TESLİMAT OLARAK İŞARETLE ---
export const markOrderAsDelivered = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Order, Notification } = await getTenantModels(req);

  const order = await Order.findOne({
    _id: req.params.id,
    tenant: req.tenant,
  })
    .populate("user", "name email")
    .populate("items.product");

  if (!order) {
    res.status(404).json({
      success: false,
      message: orderT("error.orderNotFound", locale),
    });
    return;
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();
  await order.save();

  if (isPopulatedUser(order.user)) {
    await Notification.create({
      user: order.user._id,
      tenant: req.tenant,
      type: "success",
      message: orderT("order.delivered", locale),
      data: { orderId: order._id },
      language: locale,
    });
  }

  res.status(200).json({
    success: true,
    message: orderT("order.delivered.success", locale),
    data: order,
  });
});

// --- SİPARİŞİ SİL ---
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Order } = await getTenantModels(req);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({
      success: false,
      message: orderT("error.orderNotFound", locale),
    });
    return;
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: orderT("order.deleted.success", locale),
  });
});
