import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { isValidObjectId } from "@/core/utils/validation";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

// Gerekirse burada shape dönüştürürsün (şimdilik aynen geçiyoruz)
const normalizePricingItem = (item: any) => ({ ...item });

/* LIST (public) */
export const getAllPricing = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Pricing } = await getTenantModels(req);

  const {
    category,
    planType,
    region,
    segment,
    onlyPopular,
    onDate,
    limit = "100",
  } = req.query as Record<string, string>;

  const now = onDate ? new Date(onDate) : new Date();

  // status alanı opsiyonel: yoksa da kabul et
  const statusFilter = { $or: [{ status: { $exists: false } }, { status: "active" }] };

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
    ...statusFilter,
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
    ],
  };

  if (category) filter.category = category;
  if (planType) filter.planType = planType;
  if (region) filter.regions = { $in: [region] };   // alan yoksa bu şartı eklemiyoruz
  if (segment) filter.segments = { $in: [segment] };

  const onlyPopularBool =
    typeof onlyPopular === "string" &&
    ["true", "1", "yes", "on"].includes(onlyPopular.toLowerCase());
  if (onlyPopularBool) filter.isPopular = true;

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);

  const list = await Pricing.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .limit(lim)
    .lean();

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    resultCount: list.length,
    filterApplied: filter,
  });

  res
    .status(200)
    .json({ success: true, message: t("log.listed"), data: list.map(normalizePricingItem) });
});

/* DETAIL (public) */
export const getPricingById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Pricing } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const now = req.query.onDate ? new Date(String(req.query.onDate)) : new Date();

  const statusFilter = { $or: [{ status: { $exists: false } }, { status: "active" }] };

  const pricing = await Pricing.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
    ...statusFilter,
    $and: [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] },
    ],
  }).lean();

  if (!pricing) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  res
    .status(200)
    .json({ success: true, message: t("log.fetched"), data: normalizePricingItem(pricing) });
});
