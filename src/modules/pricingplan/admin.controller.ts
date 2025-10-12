import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { fillAllLocalesArray } from "@/core/utils/i18n/fillAllLocalesArray";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const tByReq = (req: Request) => (k: string, p?: any) => translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

// normalize for outbound
function normalizePricingPlanItem(item: any) { return { ...item }; }

/* ============ ADMIN: LIST ============ */
export const getAllPricingPlanAdmin = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PricingPlan } = await getTenantModels(req);

  const {
    q, status, isActive, isPublished, category, planType,
    segment, region, onDate, limit = "50", page = "1", sort = "order:asc"
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };
  if (status) filter.status = status;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (typeof isPublished === "string") filter.isPublished = isPublished === "true";
  if (category) filter.category = category;
  if (planType) filter.planType = planType;
  if (segment) filter.segments = { $in: [segment] };
  if (region) filter.regions = { $in: [region] };
  if (onDate) {
    const d = new Date(onDate);
    filter.$and = [
      { $or: [{ effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: d } }] },
      { $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: d } }] },
    ];
  }
  if (q?.trim()) {
    const rx = new RegExp(q.trim(), "i");
    filter.$or = [
      { code: rx }, { slug: rx }, { category: rx },
      ...["en", "de", "fr", "tr", "es", "pl"].map(l => ({ [`title.${l}`]: rx }))
    ];
  }

  const [sortField, sortDirRaw] = String(sort).split(":");
  const sortDir = sortDirRaw === "asc" ? 1 : -1;
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
  const skip = (Math.max(parseInt(String(page), 10) || 1, 1) - 1) * lim;

  const [items, total] = await Promise.all([
    PricingPlan.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(lim).lean(),
    PricingPlan.countDocuments(filter),
  ]);

  logger.withReq.info(req, t("log.admin_listed"), { ...getRequestContext(req), resultCount: items.length });
  res.status(200).json({ success: true, message: t("log.admin_listed"), data: items.map(normalizePricingPlanItem), paging: { total, limit: lim, page: Number(page) } });
});

/* ============ ADMIN: GET BY ID ============ */
export const getPricingPlanByIdAdmin = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { PricingPlan } = await getTenantModels(req);

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("error.invalid_id") }); return; }

  const pricingplan = await PricingPlan.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!pricingplan) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  res.status(200).json({ success: true, message: t("log.admin_fetched"), data: normalizePricingPlanItem(pricingplan) });
});

/* ============ ADMIN: CREATE ============ */
export const createPricingPlan = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PricingPlan } = await getTenantModels(req);

  const b = req.body || {};

  const doc = {
    tenant: req.tenant,
    code: b.code,
    slug: b.slug,

    title: fillAllLocales(parseIfJson(b.title)),
    description: fillAllLocales(parseIfJson(b.description)),
    ctaLabel: fillAllLocales(parseIfJson(b.ctaLabel)),
    ctaUrl: b.ctaUrl,
    iconUrl: b.iconUrl,
    imageUrl: b.imageUrl,

    planType: b.planType,
    category: b.category,
    status: b.status || "draft",
    isActive: b.isActive !== undefined ? !!b.isActive : true,

    isPublished: !!b.isPublished,
    publishedAt: b.publishedAt ? new Date(b.publishedAt) : undefined,

    price: Number(b.price),
    compareAtPrice: b.compareAtPrice != null ? Number(b.compareAtPrice) : undefined,
    currency: b.currency,
    period: b.period,
    setupFee: b.setupFee != null ? Number(b.setupFee) : undefined,
    priceIncludesTax: b.priceIncludesTax != null ? !!b.priceIncludesTax : undefined,
    vatRate: b.vatRate != null ? Number(b.vatRate) : undefined,

    unitName: fillAllLocales(parseIfJson(b.unitName)),
    includedUnits: b.includedUnits != null ? Number(b.includedUnits) : undefined,
    pricePerUnit: b.pricePerUnit != null ? Number(b.pricePerUnit) : undefined,
    tiers: Array.isArray(b.tiers) ? b.tiers : parseIfJson(b.tiers),

    trialDays: b.trialDays != null ? Number(b.trialDays) : undefined,
    minTermMonths: b.minTermMonths != null ? Number(b.minTermMonths) : undefined,

    features: fillAllLocalesArray(parseIfJson(b.features)),
    featureItems: Array.isArray(b.featureItems) ? b.featureItems.map(parseIfJson) : (parseIfJson(b.featureItems) || []),

    regions: Array.isArray(b.regions) ? b.regions : (typeof b.regions === "string" ? b.regions.split(",").map((s: string) => s.trim()).filter(Boolean) : []),
    segments: Array.isArray(b.segments) ? b.segments : (typeof b.segments === "string" ? b.segments.split(",").map((s: string) => s.trim()).filter(Boolean) : []),

    isPopular: !!b.isPopular,
    order: b.order != null ? Number(b.order) : 0,

    effectiveFrom: b.effectiveFrom ? new Date(b.effectiveFrom) : undefined,
    effectiveTo: b.effectiveTo ? new Date(b.effectiveTo) : undefined,
  };

  const created = await PricingPlan.create(doc as any);
  logger.withReq.info(req, t("log.admin_created"), { ...getRequestContext(req), pricingplanId: created._id });
  res.status(201).json({ success: true, message: t("log.admin_created"), data: normalizePricingPlanItem(created.toObject()) });
});

/* ============ ADMIN: UPDATE ============ */
export const updatePricingPlan = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PricingPlan } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("error.invalid_id") }); return; }

  const existing = await PricingPlan.findOne({ _id: id, tenant: req.tenant });
  if (!existing) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  const b = req.body || {};

  if (b.code !== undefined) (existing as any).code = b.code;
  if (b.slug !== undefined) (existing as any).slug = b.slug;

  if (b.title) existing.title = mergeLocalesForUpdate(existing.title, parseIfJson(b.title));
  if (b.description) existing.description = mergeLocalesForUpdate(existing.description, parseIfJson(b.description));
  if (b.ctaLabel) existing.ctaLabel = mergeLocalesForUpdate(existing.ctaLabel || {}, parseIfJson(b.ctaLabel));
  if (b.unitName) existing.unitName = mergeLocalesForUpdate(existing.unitName || {}, parseIfJson(b.unitName));

  const fields = [
    "ctaUrl", "iconUrl", "imageUrl", "planType", "category", "status", "currency", "period",
    "priceIncludesTax"
  ] as const;

  for (const f of fields) if (b[f] !== undefined) (existing as any)[f] = b[f];
  if (b.isActive !== undefined) existing.isActive = !!b.isActive;
  if (b.isPublished !== undefined) existing.isPublished = !!b.isPublished;

  const numFields = ["price", "compareAtPrice", "setupFee", "vatRate", "includedUnits", "pricePerUnit", "trialDays", "minTermMonths", "order"] as const;
  for (const f of numFields) if (b[f] !== undefined) (existing as any)[f] = Number(b[f]);

  if (b.tiers !== undefined) (existing as any).tiers = Array.isArray(b.tiers) ? b.tiers : parseIfJson(b.tiers);
  if (b.features !== undefined) (existing as any).features = fillAllLocalesArray(parseIfJson(b.features));
  if (b.featureItems !== undefined) (existing as any).featureItems = Array.isArray(b.featureItems) ? b.featureItems : (parseIfJson(b.featureItems) || []);

  if (b.regions !== undefined) {
    (existing as any).regions = Array.isArray(b.regions) ? b.regions : (typeof b.regions === "string" ? b.regions.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  }
  if (b.segments !== undefined) {
    (existing as any).segments = Array.isArray(b.segments) ? b.segments : (typeof b.segments === "string" ? b.segments.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  }

  if (b.publishedAt !== undefined) (existing as any).publishedAt = b.publishedAt ? new Date(b.publishedAt) : undefined;
  if (b.effectiveFrom !== undefined) (existing as any).effectiveFrom = b.effectiveFrom ? new Date(b.effectiveFrom) : undefined;
  if (b.effectiveTo !== undefined) (existing as any).effectiveTo = b.effectiveTo ? new Date(b.effectiveTo) : undefined;

  const updated = await existing.save();

  logger.withReq.info(req, t("log.admin_updated"), { ...getRequestContext(req), pricingplanId: updated._id });
  res.status(200).json({ success: true, message: t("log.admin_updated"), data: normalizePricingPlanItem(updated.toObject()) });
});

/* ============ ADMIN: DELETE ============ */
export const deletePricingPlan = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { PricingPlan } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("error.invalid_id") }); return; }

  const deleted = await PricingPlan.findOneAndDelete({ _id: id, tenant: req.tenant });
  if (!deleted) { res.status(404).json({ success: false, message: t("error.not_found") }); return; }

  logger.withReq.info(req, t("log.admin_deleted"), { ...getRequestContext(req), pricingplanId: deleted._id });
  res.status(200).json({ success: true, message: t("log.admin_deleted"), data: normalizePricingPlanItem(deleted.toObject ? deleted.toObject() : deleted) });
});
