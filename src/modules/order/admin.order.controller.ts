import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const validStatuses = [
  "pending",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
] as const;

// Kısayol
function orderT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, orderTranslations, vars);
}

export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { lang } = req.query;
    const filter: any = { tenant: req.tenant };

    if (lang) {
      filter.language = lang;
    }

    const { Order } = await getTenantModels(req);
    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const locale: SupportedLocale =
      (lang as SupportedLocale) || (req.locale as SupportedLocale) || "en";

    res.status(200).json({
      success: true,
      message: orderT("order.fetched.all", locale),
      data: orders,
    });
    return;
  }
);

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.body;

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: orderT("error.invalidOrderStatus", req.locale || "en"),
      });
      return;
    }
    const { Order } = await getTenantModels(req);

    const order = await Order.findOne({
      _id: req.params.id,
      tenant: req.tenant,
    }).populate("user", "name email language");
    if (!order) {
      res.status(404).json({
        success: false,
        message: orderT("error.orderNotFound", req.locale || "en"),
      });
      return;
    }

    order.status = status;
    await order.save();

    if (order.user && typeof order.user === "object" && "email" in order.user) {
      const user = order.user as {
        email: string;
        name?: string;
        language?: string;
      };

      const { Notification } = await getTenantModels(req);
      const locale: SupportedLocale =
        (user.language as SupportedLocale) || "en";

      await Notification.create({
        user: order.user._id || order.user,
        tenant: req.tenant,
        type: "success",
        message: orderT(`order.status.${status}`, locale),
        data: { orderId: order._id, newStatus: status },
        language: locale,
      });
      // await sendEmail({ ... })
    }

    res.status(200).json({
      success: true,
      message: orderT("order.status.updated", req.locale || "en"),
      data: order,
    });
    return;
  }
);

export const markOrderAsDelivered = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order, Notification } = await getTenantModels(req);
    const order = await Order.findOne({
      _id: req.params.id,
      tenant: req.tenant,
    }).populate("user", "name email language");
    if (!order) {
      res.status(404).json({
        success: false,
        message: orderT("error.orderNotFound", req.locale || "en"),
      });
      return;
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    await order.save();

    if (order.user && typeof order.user === "object" && "email" in order.user) {
      const user = order.user as {
        email: string;
        name?: string;
        language?: string;
      };
      const locale: SupportedLocale =
        (user.language as SupportedLocale) || "en";
      await Notification.create({
        user: order.user._id || order.user,
        tenant: req.tenant,
        type: "success",
        message: orderT("order.delivered", locale),
        data: { orderId: order._id },
        language: locale,
      });
      // await sendEmail({ ... })
    }

    res.status(200).json({
      success: true,
      message: orderT("order.delivered.success", req.locale || "en"),
      data: order,
    });
    return;
  }
);

export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const order = await Order.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!order) {
    res.status(404).json({
      success: false,
      message: orderT("error.orderNotFound", req.locale || "en"),
    });
    return;
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: orderT("order.deleted.success", req.locale || "en"),
  });
  return;
});
