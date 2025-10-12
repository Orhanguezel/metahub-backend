import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

/** basit yardımcılar */
const toArray = (v: string | string[] | undefined) =>
  typeof v === "undefined"
    ? []
    : Array.isArray(v)
    ? v
    : String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

// İzinli select alanları (güvenlik)
const ALLOWED_SELECT = new Set([
  "_id",
  "type",
  "title",
  "summary",
  "content",
  "slug",
  "images",
  "category",
  "tags",
  "publishedAt",
  "order",
  "createdAt",
  "updatedAt",
]);

/* PUBLISHED (list) — ESNETİLDİ */
export const getPublishedGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery, GalleryCategory } = await getTenantModels(req); // ← kategori için
  const t = (k: string) => translate(k, locale, translations);

  const {
    page = "1",
    limit = "100",
    category,            // id veya slug gelebilir
    type,                // "image" | "video"
    tags,                // "carousel" ya da "a,b,c"
    select,              // "title,summary,slug,images,category,tags"
    populate,            // "category"
    sort,                // opsiyonel override
    q,                   // opsiyonel arama (ör: q=title.en:robust)
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 100);
  const skip     = (pageNum - 1) * limitNum;

  const filters: any = {
    tenant: (req as any).tenant,
    isPublished: true,
    isActive: true,
  };

  if (type === "image" || type === "video") {
    filters.type = type;
  }

  // tags (IN sorgusu)
  const tagList = toArray(tags);
  if (tagList.length) {
    filters.tags = { $in: tagList };
  }

  // Basit arama desteği (örn: q=title.en:robust)
  if (q && q.includes(":")) {
    const [field, value] = q.split(":");
    if (field && value) {
      filters[field] = { $regex: value, $options: "i" };
    }
  }

  // category: id veya slug olabilir
  let categoryId: any = null;
  if (category) {
    if (isValidObjectId(category)) {
      categoryId = category;
    } else if (GalleryCategory) {
      const catDoc = await GalleryCategory.findOne({
        slug: String(category).trim(),
        tenant: (req as any).tenant,
        isActive: true,
      })
        .select("_id")
        .lean();
      categoryId = catDoc?._id || null;
    }
    if (categoryId) {
      filters.category = categoryId;
    } else {
      // slug verildi ama bulunamadıysa sonuç boş olsun
      filters.category = "__no_match__";
    }
  }

  // SELECT beyaz listesi
  let projection: string | undefined = undefined;
  if (select) {
    const fields = toArray(select).filter((f) => ALLOWED_SELECT.has(f));
    if (fields.length) projection = fields.join(" ");
  }

  // POPULATE
  const populateList = toArray(populate);
  const doPopulateCategory = populateList.includes("category");

  // SORT
  const sortObj =
    sort && String(sort).trim().length
      ? // örn: "-order,-publishedAt"
        String(sort)
          .split(",")
          .reduce((acc: any, token) => {
            token = token.trim();
            if (!token) return acc;
            if (token.startsWith("-")) acc[token.slice(1)] = -1;
            else acc[token] = 1;
            return acc;
          }, {})
      : { order: 1, publishedAt: -1, createdAt: -1 };

  // Query
  let qy = Gallery.find(filters).sort(sortObj).skip(skip).limit(limitNum);
  if (projection) qy = qy.select(projection);
  if (doPopulateCategory) qy = qy.populate({ path: "category", select: "name slug" });

  const [items, total] = await Promise.all([
    qy.lean(),
    Gallery.countDocuments(filters),
  ]);

  res.set("X-Total-Count", String(total));
  res.status(200).json({ success: true, data: items, total });
});

/* PUBLISHED by category (ID) — aynı kalsın, ama tekil ID için */
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

/* NEW: PUBLISHED by category SLUG */
export const getPublishedGalleryItemsByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery, GalleryCategory } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { slug } = req.params;
  if (!slug) {
    res.status(400).json({ success: false, message: t("invalidCategory") });
    return;
  }

  const cat = await GalleryCategory.findOne({
    slug: String(slug).trim(),
    tenant: (req as any).tenant,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!cat?._id) {
   res.status(200).json({ success: true, data: [], total: 0 });
   return;
  }

  const items = await Gallery.find({
    category: cat._id,
    tenant: (req as any).tenant,
    isPublished: true,
    isActive: true,
  })
    .sort({ order: 1, publishedAt: -1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: items, total: items.length });
});

/* GET ONE by id (public) — isPublished filtresi eklendi */
export const getGalleryItemById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidGalleryId") });
    return;
  }

  const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
  const includeUnpublished = String(req.query.includeUnpublished || "").toLowerCase() === "true";

  const filter: any = { _id: id, tenant: (req as any).tenant };
  if (!includeInactive) filter.isActive = true;
  if (!includeUnpublished) filter.isPublished = true;

  const item = await Gallery.findOne(filter).lean();
  if (!item) {
    res.status(404).json({ success: false, message: t("galleryItemNotFound") });
    return;
  }

  res.status(200).json({ success: true, data: item });
});

/* NEW: GET ONE by slug (public) */
export const getGalleryItemBySlug = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const { Gallery } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { slug } = req.params;
  if (!slug) {
    res.status(400).json({ success: false, message: t("invalidGalleryId") });
    return;
  }

  const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
  const includeUnpublished = String(req.query.includeUnpublished || "").toLowerCase() === "true";

  const filter: any = { slug: String(slug).trim(), tenant: (req as any).tenant };
  if (!includeInactive) filter.isActive = true;
  if (!includeUnpublished) filter.isPublished = true;

  const item = await Gallery.findOne(filter).lean();
  if (!item) {
    res.status(404).json({ success: false, message: t("galleryItemNotFound") });
    return;
  }

  res.status(200).json({ success: true, data: item });
});

/* DISTINCT categories (id listesi) aynı kalabilir */
export const getGalleryCategories = asyncHandler(async (req: Request, res: Response) => {
  const { Gallery } = await getTenantModels(req);
  const categories = await Gallery.distinct("category", { tenant: (req as any).tenant, isActive: true });
  res.status(200).json({ success: true, data: categories });
});

/* SEARCH (flex) — olduğu gibi kalabilir */
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
    // Not: Gerekirse burada da slug->id çevirisi eklenebilir
  }

  const [items, total] = await Promise.all([
    Gallery.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Gallery.countDocuments(filters),
  ]);

  res.set("X-Total-Count", String(total));
  res.status(200).json({ success: true, data: items, total });
});
