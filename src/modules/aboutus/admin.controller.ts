import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId, Types } from "mongoose";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
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
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

/* ---------- helpers ---------- */
type TL = Partial<Record<SupportedLocale, string>>;
type TLFull = Record<SupportedLocale, string>;

const parseIfJson = (v: unknown) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

const ensureTL = (v: unknown, baseLocale: SupportedLocale): TLFull =>
  fillAllLocales((parseIfJson(v) as TL) || {}, baseLocale) as TLFull;

const fillAllLocalesArray = (
  input: Partial<Record<SupportedLocale, unknown>> | undefined | null,
  baseLocale: SupportedLocale
): Record<SupportedLocale, string[]> => {
  const src = (input ?? {}) as Partial<Record<SupportedLocale, unknown>>;

  const firstDefined = (): string[] | undefined => {
    for (const l of SUPPORTED_LOCALES) {
      const v = src[l];
      if (Array.isArray(v)) return (v as unknown[]).map(String);
      if (typeof v === "string" && v.trim()) return String(v).split(",").map((s) => s.trim());
    }
    return undefined;
  };

  const base: string[] =
    (Array.isArray(src[baseLocale]) ? (src[baseLocale] as unknown[]).map(String) :
      (typeof src[baseLocale] === "string" ? String(src[baseLocale]).split(",").map((s) => s.trim()) : undefined)) ??
    firstDefined() ??
    [];

  const out = {} as Record<SupportedLocale, string[]>;
  for (const l of SUPPORTED_LOCALES) {
    const v = src[l];
    let arr: string[] = [];
    if (Array.isArray(v)) arr = (v as unknown[]).map(String);
    else if (typeof v === "string") arr = String(v).split(",").map((s) => s.trim());
    const cleaned = (arr.length ? arr : base).map((s) => s.trim()).filter(Boolean);
    out[l] = [...new Set(cleaned)];
  }
  return out;
};

const normalizeI18nTags = (value: unknown, baseLocale: SupportedLocale): Record<SupportedLocale, string[]> => {
  const raw = parseIfJson(value);
  if (Array.isArray(raw)) return fillAllLocalesArray({ [baseLocale]: raw }, baseLocale);
  if (typeof raw === "string") return fillAllLocalesArray({ [baseLocale]: raw }, baseLocale);
  return fillAllLocalesArray(raw as Partial<Record<SupportedLocale, unknown>>, baseLocale);
};

const coerceObjectId = (v: unknown): Types.ObjectId | undefined => {
  const s = typeof v === "object" && v && (v as any).$oid ? (v as any).$oid : v;
  return isValidObjectId(String(s)) ? new Types.ObjectId(String(s)) : undefined;
};

function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

async function ensureUniqueSlugForLocale(
  tenant: string,
  base: string,
  locale: SupportedLocale,
  AboutusModel: any,
  currentId?: string
): Promise<string> {
  let slug = base || "about";
  let i = 2;
  const pathKey = `slugLower.${locale}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lower = slug.toLowerCase();
    const clash = await AboutusModel.findOne({
      tenant,
      [pathKey]: lower,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).lean();
    if (!clash) return slug;
    slug = `${base}-${i++}`;
  }
}

async function buildUniqueSlugObject(
  tenant: string,
  source: TL | string | undefined,
  title: TLFull,
  AboutusModel: any,
  currentId?: string
): Promise<TL> {
  const out: TL = {};
  const src = (typeof source === "string" ? {} : (source || {})) as TL;

  for (const loc of SUPPORTED_LOCALES) {
    const raw =
      (src as any)[loc] ??
      (title as any)[loc] ??
      (title as any)["en"] ??
      (Object.values(title || {})[0] as string) ??
      "about";

    const base = slugifyUnicode(String(raw));
    out[loc] = await ensureUniqueSlugForLocale(tenant, base, loc, AboutusModel, currentId);
  }
  return out;
}

function normalizeAboutusItem(item: any) {
  const emptyTags = SUPPORTED_LOCALES.reduce((acc, l) => {
    acc[l] = [];
    return acc;
  }, {} as Record<SupportedLocale, string[]>);

  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: item?.tags && typeof item.tags === "object" ? item.tags : emptyTags,
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

/* ---------- CREATE ---------- */
export const createAboutus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Aboutus } = await getTenantModels(req);
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { category, isPublished, publishedAt, order } = req.body;

  const title = ensureTL(req.body.title, locale);
  const summary = ensureTL(req.body.summary, locale);
  const content = ensureTL(req.body.content, locale);

  const primaryLocale =
    (Object.keys(title) as SupportedLocale[]).find((l) => title[l]?.trim()) || locale;

  const tags = normalizeI18nTags(req.body.tags, primaryLocale);

  const cat = coerceObjectId(category);
  if (!cat) {
    res.status(422).json({ success: false, message: t("validation.category") });
    return;
  }

  const slugInput = parseIfJson(req.body.slug) as TL | string | undefined;
  const slugObj = await buildUniqueSlugObject((req as any).tenant, slugInput, title, Aboutus);

  // images
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

  const doc = await Aboutus.create({
    tenant: (req as any).tenant,
    title,
    summary,
    content,
    slug: slugObj, // slugLower hook’ta set edilecek
    images,
    tags,
    category: cat,
    author: (req as any).user?.name || "System",
    isActive: true,
    isPublished: isPublished === true || isPublished === "true",
    publishedAt: isPublished ? (publishedAt ? new Date(publishedAt) : new Date()) : undefined,
    order: Number.isFinite(+order) ? +order : 0,
  });

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: normalizeAboutusItem(doc.toObject?.() || doc) });
});

/* ---------- UPDATE ---------- */
export const updateAboutus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Aboutus } = await getTenantModels(req);
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Aboutus.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const U = req.body as Record<string, unknown>;

  if (U.title !== undefined) (doc as any).title = mergeLocalesForUpdate(doc.title, U.title);
  if (U.summary !== undefined) (doc as any).summary = mergeLocalesForUpdate(doc.summary, U.summary);
  if (U.content !== undefined) (doc as any).content = mergeLocalesForUpdate(doc.content, U.content);

  if (U.slug !== undefined) {
    const slugInput = parseIfJson(U.slug) as TL | string | undefined;

    if (typeof slugInput === "string") {
      const base = slugifyUnicode(slugInput);
      const unique = await ensureUniqueSlugForLocale(
        (req as any).tenant, base, locale, Aboutus, doc._id.toString()
      );
      (doc as any).slug = { ...(doc.slug || {}), [locale]: unique };
    } else {
      const incoming = (slugInput || {}) as TL;
      const next: TL = { ...(doc.slug || {}) };
      for (const loc of SUPPORTED_LOCALES) {
        if (incoming[loc]) {
          const base = slugifyUnicode(String(incoming[loc]));
          next[loc] = await ensureUniqueSlugForLocale(
            (req as any).tenant, base, loc, Aboutus, doc._id.toString()
          );
        }
      }
      (doc as any).slug = next;
    }
  }

  if (U.category !== undefined) {
    const cat = coerceObjectId(U.category);
    if (!cat) { res.status(422).json({ success: false, message: t("validation.category") }); return; }
    (doc as any).category = cat;
  }

  if (U.tags !== undefined) {
    const baseLoc =
      (Object.keys(doc.title || {}) as SupportedLocale[]).find((l) => (doc.title as any)?.[l]?.trim()) || locale;
    (doc as any).tags = normalizeI18nTags(U.tags, baseLoc);
  }

  if (U.order !== undefined) (doc as any).order = Number.isFinite(+(U as any).order) ? +(U as any).order : doc.order;
  if (U.isActive !== undefined) (doc as any).isActive = U.isActive === true || U.isActive === "true";

  if (U.isPublished !== undefined) {
    const want = U.isPublished === true || U.isPublished === "true";
    (doc as any).isPublished = want;
    (doc as any).publishedAt = want
      ? ((U as any).publishedAt ? new Date(String((U as any).publishedAt)) : (doc as any).publishedAt || new Date())
      : undefined;
  }

  // new images
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail; webp = processed.webp;
      }
      (doc as any).images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // remove images by ids or descriptors
  const rawRemove = (U as any).removeImageIds ?? (U as any)["removeImageIds[]"];
  const removeIds: string[] = Array.isArray(rawRemove)
    ? (rawRemove as unknown[]).map((v: unknown) => String(v))
    : typeof rawRemove === "string" && rawRemove ? [String(rawRemove)] : [];
  if (removeIds.length) {
    const ids = new Set<string>(removeIds.map(String));
    (doc as any).images = (doc as any).images.filter((img: any) =>
      img._id ? !ids.has(String(img._id)) : true
    );
  }

  if ((U as any).removedImages) {
    try {
      const removed: Array<{ url?: string; publicId?: string }> = JSON.parse(String((U as any).removedImages));
      const byUrl = new Set<string>(removed.map((r) => r.url).filter((u): u is string => !!u));
      (doc as any).images = (doc as any).images.filter((img: any) => !byUrl.has(img.url));
      for (const r of removed) {
        if (r.url) {
          const localPath = path.join("uploads", (req as any).tenant, "about-images", path.basename(r.url));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        if (r.publicId) { try { await cloudinary.uploader.destroy(r.publicId); } catch {} }
      }
    } catch {}
  }

  if ((U as any).existingImagesOrder) {
    try {
      const orderSig = JSON.parse(String((U as any).existingImagesOrder)) as string[];
      const map = new Map<string, any>();
      for (const img of (doc as any).images) {
        const key = (img as any).publicId || (img as any).url;
        if (key) map.set(String(key), img);
      }
      const next: any[] = [];
      for (const k of orderSig) {
        const hit = map.get(String(k));
        if (hit) { next.push(hit); map.delete(String(k)); }
      }
      (doc as any).images = [...next, ...Array.from(map.values())];
    } catch {}
  }

  await (doc as any).save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id: (doc as any)._id });
  res.json({ success: true, message: t("updated"), data: normalizeAboutusItem(doc.toObject?.() || doc) });
});

/* ---------- LIST (Admin) ---------- */
export const adminGetAllAboutus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Aboutus } = await getTenantModels(req);
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { language, category, isPublished, isActive, q, page = "1", limit = "50" } =
    req.query as Record<string, string>;

  const filter: any = { tenant: (req as any).tenant };

  if (language && SUPPORTED_LOCALES.includes(language as SupportedLocale))
    filter[`title.${language}`] = { $exists: true };

  if (typeof category === "string" && isValidObjectId(category)) filter.category = category;
  if (typeof isPublished === "string") filter.isPublished = isPublished === "true";
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`slugLower.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`title.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`summary.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`tags.${l}`]: rx })),
    ];
  }

  const pg = Math.max(1, parseInt(page || "1", 10));
  const lm = Math.max(1, Math.min(200, parseInt(limit || "50", 10)));
  const skip = (pg - 1) * lm;

  const [items, total] = await Promise.all([
    Aboutus.find(filter)
      .populate([{ path: "category", select: "name slug" }])
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(lm)
      .lean(),
    Aboutus.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: t("listFetched"),
    data: (items || []).map((it: any) => normalizeAboutusItem(it)),
    meta: { total, page: pg, limit: lm },
  });
});

/* ---------- GET by ID (Admin) ---------- */
export const adminGetAboutusById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Aboutus } = await getTenantModels(req);
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc: any = await Aboutus.findOne({ _id: id, tenant: (req as any).tenant })
    .populate([{ path: "category", select: "name slug" }, { path: "comments", strictPopulate: false }])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.json({
    success: true,
    message: t("fetched"),
    data: normalizeAboutusItem(doc),
  });
});

/* ---------- DELETE ---------- */
export const deleteAboutus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { Aboutus } = await getTenantModels(req);
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Aboutus.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  for (const img of (doc as any).images || []) {
    try {
      const localPath = path.join("uploads", (req as any).tenant, "about-images", path.basename(img.url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if ((img as any).publicId) await cloudinary.uploader.destroy((img as any).publicId);
    } catch { /* noop */ }
  }

  await (doc as any).deleteOne();
  res.json({ success: true, message: t("deleted") });
});
