import { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import asyncHandler from "express-async-handler";
import { ILibrary } from "@/modules/library/types";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/* ---------- helpers ---------- */
type TL = Partial<Record<SupportedLocale, string>>;

const parseIfJson = (v: unknown): unknown => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

const ensureTL = (v: unknown) => fillAllLocales((parseIfJson(v) as TL) || {});

// tags: unknown → string[]
const normalizeTags = (tags: unknown): string[] => {
  const parsed = parseIfJson(tags);
  let arr: string[] = [];
  if (Array.isArray(parsed)) {
    arr = parsed.map((s: any) => String(s)).map((s) => s.trim()).filter(Boolean);
  } else if (typeof parsed === "string") {
    arr = parsed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return Array.from(new Set(arr));
};

const coerceObjectId = (v: unknown): Types.ObjectId | undefined =>
  isValidObjectId(String((v as any)?.$oid ?? v)) ? new Types.ObjectId(String((v as any)?.$oid ?? v)) : undefined;

const ensureUniqueSlug = async (tenant: string, base: string, Model: any, currentId?: string): Promise<string> => {
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await Model.findOne({ tenant, slug, ...(currentId ? { _id: { $ne: currentId } } : {}) }).lean();
    if (!clash) return slug;
    slug = `${base}-${i++}`;
  }
};

const normalizeUrl = (u?: string) => {
  if (!u) return "";
  try {
    const url = new URL(u, "http://localhost");
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return (u || "").replace(/\/+$/, "");
  }
};

// form alan adları esnek okunsun (simple, json, tekil)
const pickArray = (body: any, keys: string[]) => {
  for (const k of keys) {
    const v = body?.[k];
    if (v === undefined) continue;
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { const parsed = JSON.parse(v); if (Array.isArray(parsed)) return parsed; } catch {/* ignore */}
      return [v];
    }
  }
  return [];
};

type RemoveImgInput = { id?: string; publicId?: string; url?: string };
const parseRemovedImages = (body: any): RemoveImgInput[] => {
  const raw = pickArray(body, ["removedImages", "removedImages[]"]);
  const out: RemoveImgInput[] = [];
  for (const it of raw) {
    if (typeof it === "string") out.push({ url: normalizeUrl(it) });
    else if (it && typeof it === "object") {
      const id = String((it as any)._id || (it as any).id || "");
      const publicId = (it as any).publicId ? String((it as any).publicId) : undefined;
      const url = (it as any).url ? normalizeUrl(String((it as any).url)) : undefined;
      if (id || publicId || url) out.push({ id, publicId, url });
    }
  }
  return out;
};
/* ---------------------------------------- */

// ✅ CREATE
export const createLibrary = asyncHandler(async (req: Request, res: Response) => {
  const { Library } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  try {
    let { title, summary, content, tags, category, isPublished, publishedAt } = req.body;

    title = ensureTL(title);
    summary = ensureTL(summary);
    content = ensureTL(content);
    const tagsArr = normalizeTags(tags);

    const images: ILibrary["images"] = [];
    const files: ILibrary["files"] = [];

    // ---- uploads (fields) ----
    if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
      if (Array.isArray((req.files as any)["images"])) {
        for (const file of (req.files as any)["images"]) {
          if (file.mimetype?.startsWith("image/")) {
            const imageUrl = getImagePath(file);
            let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
            if (shouldProcessImage()) {
              const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
              thumbnail = processed.thumbnail; webp = processed.webp;
            }
            images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
          }
        }
      }
      if (Array.isArray((req.files as any)["files"])) {
        for (const file of (req.files as any)["files"]) {
          files.push({
            url: getImagePath(file),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            publicId: (file as any).public_id,
          });
        }
      }
    }
    // ---- uploads (array) ----
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        if (file.fieldname === "images" && file.mimetype?.startsWith("image/")) {
          const imageUrl = getImagePath(file);
          let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
          if (shouldProcessImage()) {
            const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
            thumbnail = processed.thumbnail; webp = processed.webp;
          }
          images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
        }
        if (file.fieldname === "files") {
          files.push({
            url: getImagePath(file),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            publicId: (file as any).public_id,
          });
        }
      }
    }

    const nameForSlug = (title as any)?.[locale] || (title as any)?.en || "library";
    const baseSlug = slugify(String(nameForSlug), { lower: true, strict: true });
    const slug = await ensureUniqueSlug(req.tenant, baseSlug, Library);

    const library = await Library.create({
      title,
      slug,
      summary,
      tenant: req.tenant,
      content,
      tags: tagsArr,
      category: coerceObjectId(category),
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? (publishedAt || new Date()) : undefined,
      images,
      files,
      author: req.user?.name || "System",
      isActive: true,
      views: 0,
      downloadCount: 0,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: library._id });
    res.status(201).json({ success: true, message: t("created"), data: library });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "library.create", module: "library", status: "fail", error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// ✅ UPDATE (supports add/remove/reorder images + file remove)
export const updateLibrary = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Library } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale() || "tr";
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const library = await Library.findOne({ _id: id, tenant: req.tenant });
  if (!library) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const updates = req.body;

  // Çok dilli alanlar
  if (updates.title)   library.title   = mergeLocalesForUpdate(library.title,   parseIfJson(updates.title) as any);
  if (updates.summary) library.summary = mergeLocalesForUpdate(library.summary, parseIfJson(updates.summary) as any);
  if (updates.content) library.content = mergeLocalesForUpdate(library.content, parseIfJson(updates.content) as any);

  // Diğer alanlar
  if (updates.tags !== undefined) library.tags = normalizeTags(updates.tags);
  if (updates.category !== undefined) library.category = coerceObjectId(updates.category) || library.category;
  if (updates.isPublished !== undefined) library.isPublished = (updates.isPublished === "true" || updates.isPublished === true);
  if (updates.publishedAt !== undefined) library.publishedAt = updates.publishedAt;

  if (!Array.isArray(library.images)) library.images = [];
  if (!Array.isArray(library.files)) library.files = [];

  // ---- Yeni uploadlar ----
  if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
    if (Array.isArray((req.files as any)["images"])) {
      for (const file of (req.files as any)["images"]) {
        if (file.mimetype?.startsWith("image/")) {
          const imageUrl = getImagePath(file);
          let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
          if (shouldProcessImage()) {
            const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
            thumbnail = processed.thumbnail; webp = processed.webp;
          }
          library.images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
        }
      }
    }
    if (Array.isArray((req.files as any)["files"])) {
      for (const file of (req.files as any)["files"]) {
        library.files.push({
          url: getImagePath(file),
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          publicId: (file as any).public_id,
        });
      }
    }
  }
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      if (file.fieldname === "images" && file.mimetype?.startsWith("image/")) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
          thumbnail = processed.thumbnail; webp = processed.webp;
        }
        library.images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
      }
      if (file.fieldname === "files") {
        library.files.push({
          url: getImagePath(file),
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          publicId: (file as any).public_id,
        });
      }
    }
  }

  // ---- Görsel silme: id/publicId/url + legacy url dizisi ----
  const removedIds = pickArray(updates, ["removeImageIds", "removeImageIds[]", "removedImageIds", "removedImageIds[]"])
    .map((x) => String(x));

  const removedMixed = parseRemovedImages(updates);

  // legacy: removedImages: ["https://.../a.jpg", "..."]
  if (!removedMixed.length && updates.removedImages) {
    try {
      const arr = typeof updates.removedImages === "string" ? JSON.parse(updates.removedImages) : updates.removedImages;
      if (Array.isArray(arr) && arr.every((s: any) => typeof s === "string")) {
        for (const u of arr) removedMixed.push({ url: normalizeUrl(u) });
      }
    } catch {/* ignore */}
  }

  const removeOneByIndex = async (idx: number) => {
    const imgObj = library.images[idx] as any;
    const imgUrl = imgObj?.url;
    const localPath = path.join("uploads", req.tenant, "library-images", path.basename(imgUrl || ""));
    if (imgUrl && fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (imgObj?.publicId) { try { await cloudinary.uploader.destroy(imgObj.publicId); } catch {/* ignore */} }
    library.images.splice(idx, 1);
  };

  if (removedIds.length || removedMixed.length) {
    // id ile
    for (const rid of removedIds) {
      const idx = library.images.findIndex((i: any) => String(i?._id || "") === rid);
      if (idx > -1) await removeOneByIndex(idx);
    }
    // publicId/url/id object ile
    for (const r of removedMixed) {
      let idx = -1;
      if (r.id) idx = library.images.findIndex((i: any) => String(i?._id || "") === String(r.id));
      if (idx === -1 && r.publicId) idx = library.images.findIndex((i: any) => i?.publicId === r.publicId);
      if (idx === -1 && r.url) {
        const target = normalizeUrl(r.url);
        idx = library.images.findIndex((i: any) => normalizeUrl(i?.url) === target);
      }
      if (idx > -1) await removeOneByIndex(idx);
    }
  }

  // ---- Sıralama ----
  const orderIds = pickArray(updates, ["existingImagesOrderIds", "existingImagesOrderIds[]"]).map(String);
  const orderSigRaw = pickArray(updates, ["existingImagesOrder"]).map(String);

  if (orderIds.length) {
    const indexMap = new Map(orderIds.map((v, i) => [String(v), i]));
    library.images = library.images.slice().sort((a: any, b: any) => {
      const ai = indexMap.get(String(a?._id || ""));
      const bi = indexMap.get(String(b?._id || ""));
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return 0;
    });
  } else if (orderSigRaw.length) {
    const sig = (img: any) => String(img?.publicId || normalizeUrl(img?.url || ""));
    const indexMap = new Map(orderSigRaw.map((v, i) => [String(v), i]));
    library.images = library.images.slice().sort((a: any, b: any) => {
      const ai = indexMap.get(sig(a));
      const bi = indexMap.get(sig(b));
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return 0;
    });
  }

  // ---- Dosya silme (URL listesi) ----
  if (updates.removedFiles) {
    try {
      const removed: string[] = Array.isArray(updates.removedFiles)
        ? updates.removedFiles
        : typeof updates.removedFiles === "string"
        ? JSON.parse(updates.removedFiles)
        : [];
      for (const fileUrlRaw of removed) {
        const fileUrl = String(fileUrlRaw);
        const fileIdx = library.files.findIndex((f: any) => f.url === fileUrl);
        if (fileIdx > -1) {
          const fileObj = library.files[fileIdx];
          const localPath = path.join("uploads", req.tenant, "library-files", path.basename(fileUrl));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (fileObj?.publicId) { try { await cloudinary.uploader.destroy(fileObj.publicId); } catch {/* ignore */} }
          library.files.splice(fileIdx, 1);
        }
      }
    } catch (e) {
      logger.withReq.warn(req, t("invalidRemovedFiles"), { ...getRequestContext(req), error: e });
    }
  }

  await library.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: library });
});

// ✅ ADMIN LIST
export const adminGetAllLibrary = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Library } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);
  const { language, category, isPublished, isActive } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof language === "string" && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true };
  }
  if (typeof category === "string" && isValidObjectId(category)) filter.category = category;
  if (typeof isPublished === "string") filter.isPublished = isPublished === "true";
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  else filter.isActive = true;

  const list = await Library.find(filter)
    .populate([
      { path: "comments", strictPopulate: false },
      { path: "category", select: "name slug" }, // FE uyumu
    ])
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// ✅ ADMIN GET BY ID + VIEWS++
export const adminGetLibraryById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Library } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const library = await Library.findOneAndUpdate(
    { _id: id, tenant: req.tenant, isActive: true },
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate([
      { path: "comments", strictPopulate: false },
      { path: "category", select: "name slug" }, // FE uyumu
    ])
    .lean();

  if (!library || Array.isArray(library) || !library.isActive) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: library });
});

// ✅ DELETE
export const deleteLibrary = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Library } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const library = await Library.findOne({ _id: id, tenant: req.tenant });
  if (!library) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // fiziksel silme
  for (const img of library.images || []) {
    const localPath = path.join("uploads", req.tenant, "library-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch {/* log geç */} }
  }
  for (const file of library.files || []) {
    const localPath = path.join("uploads", req.tenant, "library-files", path.basename(file.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (file.publicId) { try { await cloudinary.uploader.destroy(file.publicId); } catch {/* log geç */} }
  }

  await library.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

// ✅ DOWNLOAD COUNT INCREMENT (public endpoint)
export const incrementLibraryDownloadCount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Library } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const library = await Library.findOneAndUpdate(
    { _id: id, tenant: req.tenant, isActive: true },
    { $inc: { downloadCount: 1 } },
    { new: true }
  );
  if (!library) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("downloadCountIncreased"), data: { downloadCount: library.downloadCount } });
});
