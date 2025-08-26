import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import translations from "./i18n/tr.json";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), (translations as any), p);

/* Public list: aktif+yayınlanmış + ops.available window */
export const publicGetMenuItems = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { MenuItem } = await getTenantModels(req);

  const { q, category, service, vegetarian, vegan, limit = "200" } = req.query as Record<string, string>;
  const now = new Date();

  const filter: Record<string, any> = {
    tenant: req.tenant, isActive: true, isPublished: true,
    $and: [
      { $or: [{ "ops.availableFrom": { $exists: false } }, { "ops.availableFrom": { $lte: now } }] },
      { $or: [{ "ops.availableTo": { $exists: false } }, { "ops.availableTo": { $gte: now } }] },
    ],
  };
  if (category) filter["categories.category"] = category;
  if (vegetarian != null) filter["dietary.vegetarian"] = vegetarian === "true";
  if (vegan != null) filter["dietary.vegan"] = vegan === "true";
  if (service && ["delivery","pickup","dinein"].includes(service)) {
    filter[`ops.availability.${service}`] = true;
  }

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      { slug: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
    ];
  }

  const list = await (MenuItem as any)
    .find(filter)
    .select("code slug name images categories variants dietary ops")
    .populate([{ path: "categories.category", select: "code slug name order" }])
    .sort({ "categories.order": 1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), public: true, resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

export const publicGetMenuItemBySlug = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { MenuItem } = await getTenantModels(req);
  const { slug } = req.params;

  const now = new Date();
  const doc = await (MenuItem as any)
    .findOne({
      tenant: req.tenant,
      slug: String(slug || "").toLowerCase(),
      isActive: true, isPublished: true,
      $and: [
        { $or: [{ "ops.availableFrom": { $exists: false } }, { "ops.availableFrom": { $lte: now } }] },
        { $or: [{ "ops.availableTo": { $exists: false } }, { "ops.availableTo": { $gte: now } }] },
      ],
    })
    .select("code slug name description images categories variants modifierGroups allergens additives dietary ops sku barcode taxCode")
    .populate([{ path: "categories.category", select: "code slug name order" }])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
