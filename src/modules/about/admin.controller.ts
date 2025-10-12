import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId, Types } from "mongoose";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { getImagePath, getFallbackThumbnail, processImageLocal, shouldProcessImage } from "@/core/middleware/file/uploadUtils";
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

// Partial TL → full TL (tüm diller doldurulur)
const ensureTL = (v: unknown): TLFull => {
  return fillAllLocales((parseIfJson(v) as TL) || {});
};

// tags: unknown → string[]
const normalizeTags = (tags: unknown): string[] => {
  const parsed = parseIfJson(tags);

  let arr: string[] = [];
  if (Array.isArray(parsed)) {
    arr = (parsed as unknown[]).map((s: unknown) => String(s)).filter((s: string): s is string => s.trim().length > 0);
  } else if (typeof parsed === "string") {
    arr = parsed.split(",").map((s: string) => s.trim()).filter((s: string): s is string => s.length > 0);
  }

  return Array.from(new Set<string>(arr));
};

const coerceObjectId = (v: unknown): Types.ObjectId | undefined => {
  const s = typeof v === "object" && v && (v as any).$oid ? (v as any).$oid : v;
  return isValidObjectId(String(s)) ? new Types.ObjectId(String(s)) : undefined;
};

/** Unicode güvenli slug (Çince/Arapça destekli, transliterasyonsuz) */
function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");                 // boşluk -> -
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, ""); // harf/rakam/işaret(-) dışını at (Unicode)
  s = s.replace(/-+/g, "-");                   // -- -> -
  s = s.replace(/^-+|-+$/g, "");               // kenar - temizle
  return s.toLowerCase();
}

/** Belirli bir locale için tenant scoped benzersiz slug üretimi */
async function ensureUniqueSlugForLocale(
  tenant: string,
  base: string,
  locale: SupportedLocale,
  AboutModel: any,
  currentId?: string
): Promise<string> {
  let slug = base || "about";
  let i = 2;
  const pathKey = `slugLower.${locale}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lower = slug.toLowerCase();
    const clash = await AboutModel.findOne({
      tenant,
      [pathKey]: lower,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).lean();
    if (!clash) return slug;
    slug = `${base}-${i++}`;
  }
}

/** Objeyi (slug TL) sanitize + unique hale getirir */
async function buildUniqueSlugObject(
  tenant: string,
  source: TL | string | undefined,
  title: TLFull,
  AboutModel: any,
  currentId?: string
): Promise<TL> {
  const out: TL = {};
  const src = (typeof source === "string" ? { } : (source || {})) as TL;

  // Her locale için: öncelik -> src[locale] -> src(string ise yok sayılır) -> title[locale] -> title.en -> ilk değer
  for (const loc of SUPPORTED_LOCALES) {
    const raw =
      (src as any)[loc] ??
      (title as any)[loc] ??
      (title as any)["en"] ??
      (Object.values(title || {})[0] as string) ??
      "about";

    const base = slugifyUnicode(String(raw));
    out[loc] = await ensureUniqueSlugForLocale(tenant, base, loc, AboutModel, currentId);
  }
  return out;
}

/* ---------- CREATE ---------- */
export const createAbout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    const { category, isPublished, publishedAt, order } = req.body;

    // Çok dilli alanlar (tip güvenli)
    const title   = ensureTL(req.body.title);
    const summary = ensureTL(req.body.summary);
    const content = ensureTL(req.body.content);

    // tags & order
    const tags  = normalizeTags(req.body.tags);
    const orderNum = Number.isFinite(+order) ? +order : 0;

    // kategori
    const cat = coerceObjectId(category);
    if (!cat) { res.status(422).json({ success: false, message: t("validation.category") }); return; }

    // Çok dilli slug
    const slugInput = parseIfJson(req.body.slug) as TL | string | undefined;
    const slugObj = await buildUniqueSlugObject((req as any).tenant, slugInput, title, About);

    // Görseller
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

    const doc = await About.create({
      tenant: (req as any).tenant,
      title, summary, content,
      slug: slugObj, // slugLower model hook’unda otomatik set edilecek
      images,
      tags,
      category: cat,
      author: (req as any).user?.name || "System",
      isActive: true,
      isPublished: isPublished === true || isPublished === "true",
      publishedAt: isPublished ? (publishedAt ? new Date(publishedAt) : new Date()) : undefined,
      order: orderNum,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
    return;
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), { ...getRequestContext(req), error: err?.message });
    res.status(500).json({ success: false, message: t("error.create_fail") });
    return;
  }
});

/* ---------- UPDATE ---------- */
export const updateAbout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const doc = await About.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const U = req.body as Record<string, unknown>;

  // Çok dilli alanlar (güncelleme: merge)
  if (U.title   !== undefined) doc.title   = mergeLocalesForUpdate(doc.title,   U.title);
  if (U.summary !== undefined) doc.summary = mergeLocalesForUpdate(doc.summary, U.summary);
  if (U.content !== undefined) doc.content = mergeLocalesForUpdate(doc.content, U.content);

  // Çok dilli slug güncelleme
  if (U.slug !== undefined) {
    const slugInput = parseIfJson(U.slug) as TL | string | undefined;

    // String geldiyse sadece mevcut locale’i güncelle
    if (typeof slugInput === "string") {
      const base = slugifyUnicode(slugInput);
      const unique = await ensureUniqueSlugForLocale(
        (req as any).tenant,
        base,
        locale,
        About,
        doc._id.toString()
      );
      (doc.slug as any) = { ...(doc.slug || {}), [locale]: unique };
    } else {
      // Object geldiyse sadece gönderilen locale’leri güncelle
      const incoming = (slugInput || {}) as TL;
      const next: TL = { ...(doc.slug || {}) };
      for (const loc of SUPPORTED_LOCALES) {
        if (incoming[loc]) {
          const base = slugifyUnicode(String(incoming[loc]));
          next[loc] = await ensureUniqueSlugForLocale(
            (req as any).tenant,
            base,
            loc,
            About,
            doc._id.toString()
          );
        }
      }
      (doc.slug as any) = next;
    }
  }

  // Basit alanlar
  if (U.category !== undefined) {
    const cat = coerceObjectId(U.category);
    if (!cat) { res.status(422).json({ success: false, message: t("validation.category") }); return; }
    doc.category = cat;
  }
  if (U.tags !== undefined)  doc.tags  = normalizeTags(U.tags);
  if (U.order !== undefined) doc.order = Number.isFinite(+(U.order as any)) ? +(U.order as any) : doc.order;
  if (U.isActive !== undefined) doc.isActive = U.isActive === true || U.isActive === "true";

  // Publish mantığı
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
    ? (rawRemove as unknown[]).map((v: unknown) => String(v))
    : typeof rawRemove === "string" && rawRemove
      ? [String(rawRemove)]
      : [];
  if (removeIds.length) {
    const ids = new Set<string>(removeIds.map((s: string) => String(s)));
    doc.images = (doc.images || []).filter((img: any) => (img._id ? !ids.has(String(img._id)) : true));
  }

  if (U.removedImages) {
    try {
      const removed: Array<{ url?: string; publicId?: string }> = JSON.parse(String(U.removedImages));
      const byUrl = new Set<string>(removed.map((r) => r.url).filter((u): u is string => !!u));
      doc.images = (doc.images || []).filter((img) => !byUrl.has(img.url));
      for (const r of removed) {
        if (r.url) {
          const localPath = path.join("uploads", (req as any).tenant, "about-images", path.basename(r.url));
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
        const key = (img as any).publicId || (img as any).url;
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
  res.json({ success: true, message: t("updated"), data: doc });
  return;
});

/* ---------- LIST (Admin) ---------- */
export const adminGetAllAbout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { language, category, isPublished, isActive, q, page = "1", limit = "50" } = req.query as Record<string, string>;
  const filter: any = { tenant: (req as any).tenant };

  if (language && SUPPORTED_LOCALES.includes(language as SupportedLocale))
    filter[`title.${language}`] = { $exists: true };

  const cat = coerceObjectId(category);
  if (cat) filter.category = cat;

  if (typeof isPublished === "string") filter.isPublished = isPublished === "true";
  if (typeof isActive === "string")   filter.isActive    = isActive === "true";

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [
      // slugLower.* alanlarında ara
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`slugLower.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`title.${l}`]: rx })),
      ...SUPPORTED_LOCALES.map((l: SupportedLocale) => ({ [`summary.${l}`]: rx })),
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const lim  = Math.max(1, Math.min(200, parseInt(limit, 10)));

  const [items, total] = await Promise.all([
    About.find(filter)
      .populate([{ path: "category", select: "name slug" }])
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    About.countDocuments(filter),
  ]);

  const data = (items || []).map((it: any) => ({
    ...it,
    images: Array.isArray(it.images) ? it.images : [],
    tags: Array.isArray(it.tags) ? it.tags : [],
    comments: Array.isArray(it.comments) ? it.comments : [],
  }));

  res.json({
    success: true,
    message: t("listFetched"),
    data,
    meta: { total, page: Number(page) || 1, limit: lim },
  });
  return;
});

/* ---------- GET by ID (Admin) ---------- */
export const adminGetAboutById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { id } = req.params;

  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const doc: any = await About.findOne({ _id: id, tenant: (req as any).tenant })
    .populate([{ path: "category", select: "name slug" }, { path: "comments", strictPopulate: false }])
    .lean();

  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  res.json({
    success: true,
    message: t("fetched"),
    data: {
      ...doc,
      images: Array.isArray(doc.images) ? doc.images : [],
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      comments: Array.isArray(doc.comments) ? doc.comments : [],
    },
  });
  return;
});

/* ---------- DELETE ---------- */
export const deleteAbout: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidId") }); return; }

  const doc = await About.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  for (const img of doc.images || []) {
    try {
      const localPath = path.join("uploads", (req as any).tenant, "about-images", path.basename(img.url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    } catch {}
  }

  await doc.deleteOne();
  res.json({ success: true, message: t("deleted") });
  return;
});
