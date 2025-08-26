// src/modules/reports/analytics.controller.ts  (YENİ DOSYA)
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Types } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";

const parseDate = (v?: any) => {
  if (!v) return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
};
const defaultRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000); // son 7 gün
  return { from, to };
};
const tzOrDefault = (req: Request) => (typeof req.query.tz === "string" ? req.query.tz : "Europe/Istanbul");

// =============== 1) Saatlik Satış Isı Haritası =================
export const getHourlySales = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Payment, Order } = await getTenantModels(req);

  const { from: qFrom, to: qTo, branchId } = req.query as Record<string, string>;
  const { from, to } = { from: parseDate(qFrom) ?? defaultRange().from, to: parseDate(qTo) ?? defaultRange().to };
  const tz = tzOrDefault(req);

  let data: any[] = [];

  // Branch filtresi VARSA: Order tabanlı; YOKSA: Payment tabanlı (daha tutarlı 'paid' akışı)
  if (branchId && isValidObjectId(branchId)) {
    const bId = new Types.ObjectId(branchId);
    data = await Order.aggregate([
      { $match: {
          tenant: req.tenant,
          branch: bId,
          createdAt: { $gte: from, $lte: to },
          status: { $in: ["completed","delivered","ready","out_for_delivery","picked_up"] } // paid'e yakın durumlar
        } },
      { $project: {
          amount: "$finalTotal",
          ts: "$createdAt"
        } },
      { $addFields: {
          parts: { $dateToParts: { date: "$ts", timezone: tz } }
        } },
      { $group: {
          _id: { dow: "$parts.dayOfWeek", hour: "$parts.hour" },
          orders: { $sum: 1 },
          revenue: { $sum: "$amount" }
        } },
      { $project: {
          _id: 0,
          dayOfWeek: "$_id.dow", hour: "$_id.hour",
          orders: 1, revenue: 1
        } },
      { $sort: { dayOfWeek: 1, hour: 1 } }
    ]);
  } else {
    data = await Payment.aggregate([
      { $match: {
          tenant: req.tenant,
          status: { $in: ["confirmed","allocated"] },
          receivedAt: { $gte: from, $lte: to }
        } },
      { $project: {
          amount: "$grossAmount",
          ts: "$receivedAt"
        } },
      { $addFields: {
          parts: { $dateToParts: { date: "$ts", timezone: tz } }
        } },
      { $group: {
          _id: { dow: "$parts.dayOfWeek", hour: "$parts.hour" },
          payments: { $sum: 1 },
          revenue: { $sum: "$amount" }
        } },
      { $project: {
          _id: 0,
          dayOfWeek: "$_id.dow", hour: "$_id.hour",
          payments: 1, revenue: 1
        } },
      { $sort: { dayOfWeek: 1, hour: 1 } }
    ]);
  }

  logger.withReq.info(req, t("fetched"), { ...getRequestContext(req), resultCount: data.length, kind: "hourly_sales" });
  res.status(200).json({
    success: true,
    message: t("fetched"),
    data,
    meta: { from, to, tz, branchId: branchId || null }
  });
});

// =============== 2) Kupon Performansı =================
export const getCouponPerformance = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Order } = await getTenantModels(req);

  const { from: qFrom, to: qTo, code, limit = "100" } = req.query as Record<string, string>;
  const { from, to } = { from: parseDate(qFrom) ?? defaultRange().from, to: parseDate(qTo) ?? defaultRange().to };
  const codeU = (code || "").toUpperCase().trim();

  const pipe: any[] = [
    { $match: {
        tenant: req.tenant,
        createdAt: { $gte: from, $lte: to },
        coupon: { $exists: true, $ne: null }
      } },
    { $lookup: {
        from: "coupons", localField: "coupon", foreignField: "_id", as: "cp"
      } },
    { $unwind: "$cp" },
  ];

  if (codeU) {
    pipe.push({ $match: { "cp.code": codeU } });
  }

  pipe.push(
    { $group: {
        _id: "$cp._id",
        code: { $first: "$cp.code" },
        uses: { $sum: 1 },
        totalDiscount: { $sum: { $ifNull: ["$discount", 0] } },
        totalNet: { $sum: { $ifNull: ["$finalTotal", 0] } },
        totalGross: { $sum: { $ifNull: ["$subtotal", 0] } },
        avgBasket: { $avg: { $ifNull: ["$finalTotal", 0] } }
      } },
    { $sort: { totalDiscount: -1 } },
    { $limit: Math.min(Number(limit) || 100, 500) }
  );

  const data = await Order.aggregate(pipe);

  // opsiyonel türev metrikler
  const withDerived = data.map((d: any) => ({
    ...d,
    discountRate: d.totalGross > 0 ? d.totalDiscount / d.totalGross : 0
  }));

  logger.withReq.info(req, t("fetched"), { ...getRequestContext(req), resultCount: withDerived.length, kind: "coupon_performance" });
  res.status(200).json({
    success: true,
    message: t("fetched"),
    data: withDerived,
    meta: { from, to, code: codeU || null }
  });
});

// =============== 3) Sipariş İptalleri =================
export const getOrderCancellations = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Order } = await getTenantModels(req);

  const { from: qFrom, to: qTo, limit = "100" } = req.query as Record<string, string>;
  const { from, to } = { from: parseDate(qFrom) ?? defaultRange().from, to: parseDate(qTo) ?? defaultRange().to };

  const data = await Order.aggregate([
    { $match: {
        tenant: req.tenant,
        updatedAt: { $gte: from, $lte: to },
        status: "canceled"
      } },
    { $project: {
        reason: { $ifNull: ["$cancelReason", "unknown"] },
        serviceType: 1,
        branch: 1,
        createdAt: 1
      } },
    { $group: {
        _id: { reason: "$reason", serviceType: "$serviceType" },
        count: { $sum: 1 }
      } },
    { $project: {
        _id: 0,
        reason: "$_id.reason",
        serviceType: "$_id.serviceType",
        count: 1
      } },
    { $sort: { count: -1 } },
    { $limit: Math.min(Number(limit) || 100, 500) }
  ]);

  logger.withReq.info(req, t("fetched"), { ...getRequestContext(req), resultCount: data.length, kind: "order_cancellations" });
  res.status(200).json({
    success: true,
    message: t("fetched"),
    data,
    meta: { from, to }
  });
});
