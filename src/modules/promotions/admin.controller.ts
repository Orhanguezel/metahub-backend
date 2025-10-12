import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import type { SupportedLocale } from "@/types/common";

const tByReq = (req: Request) => (k: string, vars?: Record<string, any>) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, vars);

/* ===== CREATE ===== */
export const createPromotion = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Promotion } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;

  if (payload.code) payload.code = String(payload.code).toUpperCase().trim();

  const doc = await Promotion.create(payload);

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ===== UPDATE ===== */
export const updatePromotion = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { Promotion } = await getTenantModels(req);
  const promo = await Promotion.findOne({ _id: id, tenant: req.tenant });
  if (!promo) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  if (up.code) up.code = String(up.code).toUpperCase().trim();

  const updatable = [
    "kind",
    "code",
    "name",
    "description",
    "isActive",
    "isPublished",
    "priority",
    "stackingPolicy",
    "rules",
    "effect",
  ] as const;
  for (const k of updatable) if (up[k] !== undefined) (promo as any)[k] = up[k];

  await promo.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: promo.toJSON() });
});

/* ===== LIST ===== */
export const adminGetPromotions = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Promotion } = await getTenantModels(req);

  const { q, isActive, isPublished, kind, type, page = "1", limit = "20" } = req.query as Record<string, string>;

  const filter: any = { tenant: req.tenant };
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (isPublished !== undefined) filter.isPublished = isPublished === "true";
  if (kind) filter.kind = kind;
  if (type) filter["effect.type"] = type;

  if (q && q.trim()) {
    filter.$or = [
      { code: { $regex: q.trim(), $options: "i" } },
      { "name.tr": { $regex: q.trim(), $options: "i" } },
      { "name.en": { $regex: q.trim(), $options: "i" } },
      { "description.tr": { $regex: q.trim(), $options: "i" } },
      { "description.en": { $regex: q.trim(), $options: "i" } },
    ];
  }

  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Promotion.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(l).lean(),
    Promotion.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: t("listFetched"),
    data: items,
    meta: { page: p, limit: l, total, pages: Math.ceil(total / l) },
  });
});

/* ===== GET BY ID ===== */
export const adminGetPromotionById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { Promotion } = await getTenantModels(req);
  const doc = await Promotion.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

/* ===== DELETE ===== */
export const deletePromotion = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { Promotion } = await getTenantModels(req);
  const promo = await Promotion.findOne({ _id: id, tenant: req.tenant });
  if (!promo) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await promo.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ===== STATUS / PUBLISH ===== */
export const changePromotionStatus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { Promotion } = await getTenantModels(req);
  const promo = await Promotion.findOne({ _id: id, tenant: req.tenant });
  if (!promo) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  promo.isActive = !!isActive;
  await promo.save();

  res.status(200).json({ success: true, message: t("statusChanged"), data: promo });
});

export const changePromotionPublish = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { isPublished } = req.body as { isPublished: boolean };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { Promotion } = await getTenantModels(req);
  const promo = await Promotion.findOne({ _id: id, tenant: req.tenant });
  if (!promo) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  promo.isPublished = !!isPublished;
  await promo.save();
  res.status(200).json({ success: true, message: t("publishChanged"), data: promo });
});
