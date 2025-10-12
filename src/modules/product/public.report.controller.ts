// src/modules/product/public.report.controller.ts
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { UserReport as UserReportCompiled } from "@/modules/product/userreport.model"; // schema için

export const publicReportProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { reason, details, name, email, phone, url } = req.body || {};

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "invalid_product_id" });
    return;
  }
  if (!reason) {
    res.status(400).json({ success: false, message: "reason_required" });
    return;
  }

  const tm = await getTenantModels(req);
  const { Product } = tm as any;

  // ---- UserReport modelini güvenli al (tenant connection üzerinden) ----
  let UserReportModel: any = (tm as any).UserReportModel;
  if (!UserReportModel || typeof UserReportModel.countDocuments !== "function") {
    if (typeof (req as any).getModel === "function") {
      UserReportModel = await (req as any).getModel("userreport", (UserReportCompiled as any).schema);
    }
  }
  if (!UserReportModel || typeof UserReportModel.countDocuments !== "function") {
    res.status(500).json({ success: false, message: "userreport_model_not_loaded" });
    return;
  }

  // Ürün gerçekten public mi?
  const prod = await Product.findOne({
    _id: id,
    tenant: (req as any).tenant,
    status: "active",
    visibility: "public",
  })
    .select({ _id: 1 })
    .lean();

  if (!prod) {
    res.status(404).json({ success: false, message: "product_not_found" });
    return;
  }

  // Anti-spam: aynı IP’den aynı ürüne 24 saatte en fazla 3 rapor
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ip =
    ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()) ||
    (req.ip as string) ||
    (req.socket?.remoteAddress as string) ||
    undefined;

  const dup = await UserReportModel.countDocuments({
    tenant: (req as any).tenant,
    subjectType: "product",
    subjectRef: id,
    ...(ip ? { ip } : {}),
    createdAt: { $gte: since },
  });

  if (dup >= 3) {
    res.status(429).json({ success: false, message: "too_many_reports" });
    return;
  }

  const doc = await UserReportModel.create({
    tenant: (req as any).tenant,
    subjectType: "product",
    subjectRef: id,
    reason,
    details: details?.toString()?.slice(0, 2000) || undefined,
    status: "pending",
    createdByRef: (req as any).user?._id,
    contact: { name, email, phone },
    sessionId: (req.headers["x-session-id"] as string) || undefined,
    ip,
    userAgent: req.headers["user-agent"],
    meta: { url: url || req.get("referer"), locale: (req as any).locale || getLogLocale() },
  });

  res.status(201).json({ success: true, message: "report_received", data: { id: doc._id } });
  return;
});
