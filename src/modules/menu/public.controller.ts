import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* Public list: aktif + yayınlanmış + tarih penceresinde */
export const publicGetMenus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);

  const { q, branch, limit = "50" } = req.query as Record<string, string>;
  const now = new Date();

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
    ],
  };
  if (branch) filter.branches = branch;

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      { slug: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
    ];
  }

  const list = await (Menu as any)
    .find(filter)
    .select("code slug name images categories order effectiveFrom effectiveTo")
    .populate([{ path: "categories.category", select: "code slug name images order" }])
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), public: true, resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* Public detail by slug */
export const publicGetMenuBySlug = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Menu } = await getTenantModels(req);
  const { slug } = req.params;

  const now = new Date();
  const doc = await (Menu as any)
    .findOne({
      tenant: req.tenant,
      slug: String(slug || "").toLowerCase(),
      isActive: true, isPublished: true,
      $and: [
        { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
        { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
      ],
    })
    .select("code slug name description images categories effectiveFrom effectiveTo")
    .populate([{ path: "categories.category", select: "code slug name images order" }])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
