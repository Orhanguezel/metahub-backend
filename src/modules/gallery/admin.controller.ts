// src/modules/gallery/gallery.admin.controller.ts
import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId, Types } from "mongoose";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

/* ---------- helpers ---------- */

type TL = Partial<Record<SupportedLocale, string>>;
type TLFull = Record<SupportedLocale, string>;

const parseIfJson = (v: unknown): unknown => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

// Partial TL → full TL
const ensureTL = (v: unknown): TLFull => {
  return fillAllLocales((parseIfJson(v) as TL) || {});
};

// tags: unknown → string[]
const normalizeTags = (tags: unknown): string[] => {
  const parsed = parseIfJson(tags);
  let arr: string[] = [];
  if (Array.isArray(parsed)) {
    arr = (parsed as unknown[]).map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof parsed === "string") {
    arr = parsed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return Array.from(new Set(arr));
};

const coerceObjectId = (v: unknown): Types.ObjectId | undefined => {
  const s = typeof v === "object" && v && (v as any).$oid ? (v as any).$oid : v;
  return isValidObjectId(String(s)) ? new Types.ObjectId(String(s)) : undefined;
};

const ensureUniqueSlug = async (
  tenant: string,
  base: string,
  GalleryModel: any,
  currentId?: string
): Promise<string> => {
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await GalleryModel.findOne({
      tenant,
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).lean();
    if (!clash) return slug;
    slug = `${base}-${i++}`;
  }
};

/* ---------- LIST (Admin) ---------- */
export const getAllGalleryItems: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { q = "", category, isPublished, isActive, type, tag, page = "1", limit = "50" } =
    req.query as Record<string, string>;

  const filter: any = { tenant: (req as any).tenant };
  if (type) filter.type = type;
  if (tag) filter.tags = tag;

  const cat = coerceObjectId(category);
  if (cat) filter.category = cat;

  if (typeof isPublished === "string") filter.isPublished = isPublished === "true";
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { slug: rx },
      ...SUPPORTED_LOCALES.map((l) => ({ [`title.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l) => ({ [`summary.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l) => ({ [`content.${l}`]: rx })),
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * lim;

  const [items, total] = await Promise.all([
    Gallery.find(filter)
      .populate([{ path: "category", select: "name slug" }])
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    Gallery.countDocuments(filter),
  ]);

  const data = (items || []).map((it: any) => ({
    ...it,
    images: Array.isArray(it.images) ? it.images : [],
    tags: Array.isArray(it.tags) ? it.tags : [],
    comments: Array.isArray(it.comments) ? it.comments : [],
  }));

  res.set("X-Total-Count", String(total));
  res.status(200).json({ success: true, message: t("fetched"), data, meta: { total, page: pageNum, limit: lim } });
});

/* ---------- CREATE ---------- */
export const createGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const {
    type = "image",
    category,
    isPublished,
    publishedAt,
    order,
    slug,
    tags,
    author,
  } = req.body;

  const title   = ensureTL(req.body.title);
  const summary = ensureTL(req.body.summary);
  const content = ensureTL(req.body.content);

  const cat = coerceObjectId(category);
  if (!cat) { res.status(422).json({ success: false, message: t("validation.category") }); return; }

  const baseSlug = slug
    ? slugify(String(slug), { lower: true, strict: true })
    : slugify(title?.[locale] || title?.en || "gallery", { lower: true, strict: true });
  const uniqueSlug = await ensureUniqueSlug((req as any).tenant, baseSlug, Gallery);

  const tagList = normalizeTags(tags);
  const orderNum = Number.isFinite(+order) ? +order : 0;

  const images: Array<{ url: string; thumbnail: string; webp?: string; publicId?: string }> = [];
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  const doc = await Gallery.create({
    tenant: (req as any).tenant,
    type,
    title, summary, content,
    slug: uniqueSlug,
    images,
    tags: tagList,
    category: cat,
    author: author ?? (req as any).user?.name ?? "System",
    isActive: true,
    isPublished: isPublished === true || isPublished === "true",
    publishedAt: isPublished ? (publishedAt ? new Date(publishedAt) : new Date()) : undefined,
    order: orderNum,
  });

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ---------- UPDATE ---------- */
export const updateGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const doc = await Gallery.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const U = req.body as Record<string, unknown>;

  if (U.title   !== undefined) doc.title   = mergeLocalesForUpdate(doc.title,   U.title);
  if (U.summary !== undefined) doc.summary = mergeLocalesForUpdate(doc.summary, U.summary);
  if (U.content !== undefined) doc.content = mergeLocalesForUpdate(doc.content, U.content);

  if (U.type !== undefined) doc.type = String(U.type) as any;

  if (U.slug !== undefined) {
    const base = slugify(String(U.slug), { lower: true, strict: true });
    doc.slug = await ensureUniqueSlug((req as any).tenant, base, Gallery, doc._id.toString());
  }

  if (U.category !== undefined) {
    const cat = coerceObjectId(U.category);
    if (!cat) { res.status(422).json({ success: false, message: t("validation.category") }); return; }
    doc.category = cat;
  }

  if (U.tags !== undefined)   doc.tags  = normalizeTags(U.tags);
  if (U.order !== undefined)  doc.order = Number.isFinite(+(U.order as any)) ? +(U.order as any) : doc.order;
  if (U.isActive !== undefined) doc.isActive = U.isActive === true || U.isActive === "true";
  if (U.author !== undefined)   doc.author   = String(U.author);

  if (U.isPublished !== undefined) {
    const want = U.isPublished === true || U.isPublished === "true";
    doc.isPublished = want;
    doc.publishedAt = want ? (U.publishedAt ? new Date(U.publishedAt as string) : doc.publishedAt || new Date()) : undefined;
  }

  // Yeni görseller
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail; webp = processed.webp;
      }
      doc.images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // Silinecek görseller: removeImageIds[] veya removedImages
  const rawRemove = (U as any).removeImageIds ?? (U as any)["removeImageIds[]"];
  const removeIds: string[] = Array.isArray(rawRemove)
    ? (rawRemove as unknown[]).map((v) => String(v))
    : typeof rawRemove === "string" && rawRemove ? [String(rawRemove)] : [];
  if (removeIds.length) {
    const ids = new Set<string>(removeIds.map((s) => String(s)));
    doc.images = (doc.images || []).filter((img: any) => (img._id ? !ids.has(String(img._id)) : true));
  }

  if (U.removedImages) {
    try {
      // About paternindeki gibi: [{ url?, publicId? }, ...]
      const removed: Array<{ url?: string; publicId?: string }> = JSON.parse(String(U.removedImages));
      const byUrl = new Set<string>(removed.map((r) => r.url).filter((u): u is string => !!u));
      doc.images = (doc.images || []).filter((img) => !byUrl.has(img.url));
      for (const r of removed) {
        if (r.url) {
          const localPath = path.join("uploads", (req as any).tenant, "gallery-images", path.basename(r.url));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        if (r.publicId) { try { await cloudinary.uploader.destroy(r.publicId); } catch {} }
      }
    } catch {}
  }

  // Reorder
  if (U.existingImagesOrder) {
    try {
      const orderSig = JSON.parse(String(U.existingImagesOrder)) as string[];
      const map = new Map<string, any>();
      for (const img of doc.images) {
        const key = img.publicId || img.url;
        if (key) map.set(String(key), img);
      }
      const next: any[] = [];
      for (const k of orderSig) {
        const hit = map.get(String(k));
        if (hit) { next.push(hit); map.delete(String(k)); }
      }
      doc.images = [...next, ...Array.from(map.values())];
    } catch {}
  }

  await doc.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: doc._id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

/* ---------- TOGGLE PUBLISH ---------- */
export const togglePublishGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalidId" }); return; }

  const doc = await Gallery.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }

  doc.isPublished = !doc.isPublished;
  doc.publishedAt = doc.isPublished ? (doc.publishedAt || new Date()) : undefined;

  await doc.save();
  res.status(200).json({
    success: true,
    message: doc.isPublished ? "published" : "unpublished",
    data: doc,
  });
});

/* ---------- SOFT DELETE / RESTORE ---------- */
export const softDeleteGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalidId" }); return; }

  const doc = await Gallery.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }

  doc.isActive = false;
  await doc.save();
  res.status(200).json({ success: true, message: "archived", data: doc });
});

export const restoreGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: "invalidId" }); return; }

  const doc = await Gallery.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: "notFound" }); return; }

  doc.isActive = true;
  await doc.save();
  res.status(200).json({ success: true, message: "restored", data: doc });
});

/* ---------- HARD DELETE ---------- */
export const deleteGalleryItem: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const doc = await Gallery.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  for (const img of doc.images || []) {
    try {
      const localPath = path.join("uploads", (req as any).tenant, "gallery-images", path.basename(img.url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    } catch {}
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ---------- BATCH ---------- */
export const batchPublishGalleryItems: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const { ids = [], publish } = req.body as { ids: string[]; publish: boolean };

  const valid = (Array.isArray(ids) ? ids : []).filter((id) => isValidObjectId(id));
  if (!valid.length) { res.status(400).json({ success: false, message: "noValidIds" }); return; }

  const update = publish
    ? { $set: { isPublished: true, publishedAt: new Date() } }
    : { $set: { isPublished: false }, $unset: { publishedAt: "" } };

  const r = await Gallery.updateMany({ _id: { $in: valid }, tenant: (req as any).tenant }, update);
  res.status(200).json({ success: true, data: { modified: r.modifiedCount } });
});

export const batchDeleteGalleryItems: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const { ids = [] } = req.body as { ids: string[] };

  const valid = (Array.isArray(ids) ? ids : []).filter((id) => isValidObjectId(id));
  if (!valid.length) { res.status(400).json({ success: false, message: "noValidIds" }); return; }

  const docs = await Gallery.find({ _id: { $in: valid }, tenant: (req as any).tenant });
  for (const doc of docs) {
    for (const img of doc.images || []) {
      try {
        const localPath = path.join("uploads", (req as any).tenant, "gallery-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      } catch {}
    }
    await doc.deleteOne();
  }

  res.status(200).json({ success: true, data: { deleted: docs.length } });
});

/* ---------- GET ONE (Admin) ---------- */
export const getGalleryItemByIdAdmin: RequestHandler = asyncHandler(async (req, res) => {
  const { Gallery } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const item = await Gallery.findOne({ _id: id, tenant: (req as any).tenant }).lean();
  if (!item) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  res.status(200).json({ success: true, data: {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
  }});
});
