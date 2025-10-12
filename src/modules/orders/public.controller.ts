import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import orderTranslations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { ServiceType } from "@/modules/orders/types";
import logger from "@/core/middleware/logger/logger";

/* --- Sipariş Detay (owner veya admin) --- */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, orderTranslations, p);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant })
    .populate("items.product")
    .populate("addressId")
    .populate("branch", "code name");

  if (!order) {
    res.status(404).json({ success: false, message: t("error.orderNotFound") });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString() && req.user?.role !== "admin") {
    res.status(403).json({ success: false, message: t("error.notAuthorizedViewOrder") });
    return;
  }

  res.status(200).json({ success: true, message: t("order.fetched.success"), data: order });
  return;
});

/* --- Adres güncelle (owner) --- */
export const updateShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, orderTranslations, p);

  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({ success: false, message: t("error.orderNotFound") });
    return;
  }
  if (order.user?.toString() !== req.user?._id.toString()) {
    res.status(403).json({ success: false, message: t("error.notAuthorizedUpdateOrder") });
    return;
  }
  if (order.serviceType !== "delivery") {
    res.status(400).json({ success: false, message: t("error.addressUpdateNotAllowed") });
    return;
  }

  const { shippingAddress } = req.body;
  if (!shippingAddress) {
    res.status(400).json({ success: false, message: t("error.shippingAddressRequired") });
    return;
  }
  order.shippingAddress = { ...(order.shippingAddress as any), ...shippingAddress };
  await order.save();

  logger.withReq.info(req, t("order.addressUpdated.success") + ` | Order: ${order._id}`);
  res.status(200).json({ success: true, message: t("order.addressUpdated.success"), data: order });
  return;
});

/* --- Kullanıcının siparişleri (opsiyonel serviceType filtresi) --- */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, orderTranslations, p);
  const { serviceType } = req.query as { serviceType?: ServiceType };
  const q: any = { user: req.user?._id, tenant: req.tenant };
  if (serviceType) q.serviceType = serviceType;

  const orders = await Order.find(q)
    .populate("items.product")
    .populate("addressId")
    .populate("branch", "code name")
    .sort({ createdAt: -1 });

  // Boşsa da 200 ve [] döndür
  res.status(200).json({ success: true, message: t("order.fetched.success"), data: orders || [] });
  return;
});
