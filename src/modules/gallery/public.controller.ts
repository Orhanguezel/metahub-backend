// src/modules/gallery/gallery.public.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

/* PUBLISHED (list) */
export const getPublishedGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { page = "1", limit = "100", category } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 100);
  const skip     = (pageNum - 1) * limitNum;

  const filters: any = { tenant: (req as any).tenant, isPublished: true, isActive: true };
  if (category) filters.category = category;

  const [items, total] = await Promise.all([
    Gallery.find(filters)
      .sort({ order: 1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Gallery.countDocuments(filters),
  ]);

  res.set("X-Total-Count", String(total));
  res.status(200).json({ success: true, data: items, total });
});

/* PUBLISHED by category */
export const getPublishedGalleryItemsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { category } = req.params;
  if (!category || !isValidObjectId(category)) {
    res.status(400).json({ success: false, message: t("invalidCategory") });
    return;
  }

  const items = await Gallery.find({
    category,
    tenant: (req as any).tenant,
    isPublished: true,
    isActive: true,
  })
    .sort({ order: 1, publishedAt: -1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: items });
});

/* DISTINCT categories */
export const getGalleryCategories = asyncHandler(async (req: Request, res: Response) => {
  const { Gallery } = await getTenantModels(req);
  const categories = await Gallery.distinct("category", { tenant: (req as any).tenant, isActive: true });
  res.status(200).json({ success: true, data: categories });
});

/* SEARCH (flex filters) */
export const searchGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { Gallery } = await getTenantModels(req);

  const { search, isPublished, isActive, category, page = "1", limit = "100" } =
    req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 100);
  const skip     = (pageNum - 1) * limitNum;

  const filters: any = { tenant: (req as any).tenant };
  if (category) filters.category = category;
  if (typeof isPublished !== "undefined") filters.isPublished = isPublished === "true";
  if (typeof isActive    !== "undefined") filters.isActive    = isActive === "true";

  if (search) {
    const [field, value] = String(search).split(":");
    filters[field] = { $regex: value, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Gallery.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Gallery.countDocuments(filters),
  ]);

  res.set("X-Total-Count", String(total));
  res.status(200).json({ success: true, data: items, total });
});

/* GET ONE by id (public + opsiyonel admin önizleme) */
export const getGalleryItemById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidGalleryId") });
    return;
  }

  // Public default: sadece aktif olanı göster
  // Admin ihtiyaçları için ?includeInactive=true verildiğinde isActive filtresi kalkar
  const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";

  const filter: any = { _id: id, tenant: (req as any).tenant };
  if (!includeInactive) filter.isActive = true;

  const item = await Gallery.findOne(filter).lean();
  if (!item) {
    res.status(404).json({ success: false, message: t("galleryItemNotFound") });
    return;
  }

  res.status(200).json({ success: true, data: item });
});

/* (Opsiyonel) stats */
export const getGalleryStats = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);

  try {
    const { Gallery } = await getTenantModels(req);
    const tenant = (req as any).tenant;

    const [total, published, active, categories] = await Promise.all([
      Gallery.countDocuments({ tenant }),
      Gallery.countDocuments({ isPublished: true, tenant }),
      Gallery.countDocuments({ isActive: true, tenant }),
      Gallery.aggregate([{ $match: { tenant } }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);

    const categoriesData = categories.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({ success: true, data: { total, published, active, categories: categoriesData } });
  } catch (err: any) {
    logger.withReq.error(req, t("error.fetching_stats"), { module: "gallery", error: err?.message });
    res.status(500).json({ success: false, message: t("error.fetching_stats") });
  }
});
