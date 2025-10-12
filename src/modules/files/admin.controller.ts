import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import type { SupportedLocale } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// mevcut yardımcılarınız:
import { getImagePath, getFallbackThumbnail, shouldProcessImage, processImageLocal } from "@/core/middleware/file/uploadUtils";
// pdf için sizdeki helper'ı import edin (isim/path sizde nasılsa):
// import { generatePdfPreview } from "@/core/middleware/file/pdfUtils";

const detectKind = (mime: string) =>
  mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : mime.startsWith("text/") ? "doc" : "other";

// POST /files  (çoklu upload)
export const adminUploadFiles = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { FileObject } = await getTenantModels(req);

  if (!Array.isArray(req.files) || req.files.length === 0) {
    res.status(400).json({ success: false, message: t("validation.noFiles") });
    return;
  }

  const created: any[] = [];

  for (const file of req.files as Express.Multer.File[]) {
    const provider = (file as any).storageProvider || "local"; // uploadMiddleware içinde set ediyorsanız
    const url = getImagePath(file); // sizdeki path->public url çeviricisi
    const kind = detectKind(file.mimetype);
    const base: any = {
      tenant: req.tenant,
      kind,
      provider,
      filename: file.originalname,
      mime: file.mimetype,
      ext: (file.originalname.split(".").pop() || "").toLowerCase(),
      size: file.size,
      url,
      publicId: (file as any).public_id,
      versions: [{ kind: "original", url }],
      links: [],
      tags: [],
      isActive: true,
    };

    if (kind === "image") {
      let { thumbnail, webp } = getFallbackThumbnail(url);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, (file as any).destination);
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      if (thumbnail) base.versions.push({ kind: "thumbnail", url: thumbnail });
      if (webp) base.versions.push({ kind: "webp", url: webp });
    }

    if (kind === "pdf") {
      // pdf helper’ınız varsa ilk sayfa preview oluşturun:
      // const previewUrl = await generatePdfPreview(file.path, /* options */);
      // if (previewUrl) base.versions.push({ kind: "preview", url: previewUrl });
    }

    const doc = await FileObject.create(base);
    created.push(doc);
  }

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), count: created.length });
  res.status(201).json({ success: true, message: t("created"), data: created });
  return;
});

// GET /files (admin listeleme + filtre)
export const adminListFiles = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);

  const { kind, mime, module, refId, active } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant };

  if (kind) filter.kind = kind;
  if (mime) filter.mime = mime;
  if (typeof active === "string") filter.isActive = active === "true";
  if (module && refId && isValidObjectId(refId)) {
    filter["links.module"] = module;
    filter["links.refId"] = refId;
  }

  const data = await FileObject.find(filter).sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, message: t("listFetched"), data });
  return;
});

// GET /files/:id
export const adminGetFileById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await FileObject.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

// PUT /files/:id/link  { module, refId }
export const linkFile = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);
  const { id } = req.params;
  const { module, refId } = req.body || {};

  if (!isValidObjectId(id) || !isValidObjectId(refId) || !module) {
    res.status(400).json({ success: false, message: t("validation.linkPayload") });
    return;
  }

  const doc = await FileObject.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const exists = (doc.links || []).some((l: any) => String(l.refId) === String(refId) && l.module === module);
  if (!exists) {
    doc.links.push({ module, refId });
    await doc.save();
  }

  res.status(200).json({ success: true, message: t("linked"), data: doc });
  return;
});

// PUT /files/:id/unlink  { module, refId }
export const unlinkFile = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);
  const { id } = req.params;
  const { module, refId } = req.body || {};

  if (!isValidObjectId(id) || !isValidObjectId(refId) || !module) {
    res.status(400).json({ success: false, message: t("validation.linkPayload") });
    return;
  }

  const doc = await FileObject.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  doc.links = (doc.links || []).filter((l: any) => !(String(l.refId) === String(refId) && l.module === module));
  await doc.save();

  res.status(200).json({ success: true, message: t("unlinked"), data: doc });
  return;
});

// DELETE /files/:id  (soft delete + provider’den opsiyonel sil)
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await FileObject.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // İsteğe bağlı: provider’dan da sil (Cloudinary publicId varsa)
  // await deleteUploadedFiles([doc.url, ...doc.versions.map(v=>v.url)], doc.publicId);

  doc.isActive = false;
  await doc.save();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});
