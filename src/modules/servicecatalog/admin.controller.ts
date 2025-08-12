import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
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
import type { IServiceCatalog } from "./types";

// --------------------------- utils ---------------------------
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// normalize code → UPPER_SNAKE
const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

// name[*] içinden ilk dolu locale değeri
const firstLocaleValue = (obj?: Record<string, unknown>) => {
  if (!obj) return "";
  for (const l of SUPPORTED_LOCALES) {
    const v = obj[l];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

// --------------------------- CREATE ---------------------------
export const createServiceCatalog = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ServiceCatalog } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    let {
      code,
      name,
      description,
      defaultDurationMin,
      defaultTeamSize,
      suggestedPrice,
      category,
      tags,
      isActive,
    } = req.body;

    // i18n alanları dışarıdan gelir; sadece boşlara fallback uygula
    name = fillAllLocales(parseIfJson(name));
    description = fillAllLocales(parseIfJson(description));

    // sayısallar
    const duration = defaultDurationMin ? Number(defaultDurationMin) : undefined;
    const teamSize = defaultTeamSize ? Number(defaultTeamSize) : undefined;
    const price = suggestedPrice !== undefined && suggestedPrice !== ""
      ? Number(suggestedPrice)
      : undefined;

    // tags: string | JSON | string[]
    tags = parseIfJson(tags);
    if (typeof tags === "string") {
      try { tags = JSON.parse(tags); } catch { tags = [tags]; }
    }
    if (!Array.isArray(tags)) tags = [];

    // images
    const images: IServiceCatalog["images"] = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // code zorunlu; yoksa name içinden üret
    const codeFinal = toUpperSnake(code || firstLocaleValue(name) || "SERVICE");

    const doc = await ServiceCatalog.create({
      tenant: req.tenant,
      code: codeFinal,
      name,
      description,
      defaultDurationMin: duration ?? 30,
      defaultTeamSize: teamSize ?? 1,
      suggestedPrice: price,
      category: isValidObjectId(category) ? category : undefined,
      tags,
      images,
      isActive: isActive === "false" ? false : true,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    // duplicate code (tenant+code) yakala
    if (err?.code === 11000) {
      logger.withReq.warn(req, t("error.duplicate"), { ...getRequestContext(req), dup: err.keyValue });
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "servicecatalog.create",
      module: "servicecatalog",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// --------------------------- UPDATE ---------------------------
export const updateServiceCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ServiceCatalog } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ServiceCatalog.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  try {
    const updates = req.body;

    // i18n merge
    if (updates.name) {
      doc.name = mergeLocalesForUpdate(doc.name, parseIfJson(updates.name));
    }
    if (updates.description) {
      doc.description = mergeLocalesForUpdate(doc.description, parseIfJson(updates.description));
    }

    // code (opsiyonel değişebilir) → normalize
    if (typeof updates.code === "string") {
      doc.code = toUpperSnake(updates.code);
    }

    // numeric alanlar
    const numFields: Array<keyof IServiceCatalog> = [
      "defaultDurationMin",
      "defaultTeamSize",
      "suggestedPrice",
    ];
    for (const f of numFields) {
      if (updates[f] !== undefined && updates[f] !== "") {
        (doc as any)[f] = Number(updates[f]);
      }
    }

    // basit alanlar
    if (updates.category && isValidObjectId(updates.category)) doc.category = updates.category;
    if (updates.isActive !== undefined) doc.isActive = updates.isActive === "true" || updates.isActive === true;

    // tags
    if (updates.tags !== undefined) {
      let tags = parseIfJson(updates.tags);
      if (typeof tags === "string") {
        try { tags = JSON.parse(tags); } catch { tags = [tags]; }
      }
      if (!Array.isArray(tags)) tags = [];
      doc.tags = tags;
    }

    // images append
    if (!Array.isArray(doc.images)) doc.images = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        doc.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // removedImages: [{ url, publicId }]
    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        doc.images = doc.images.filter((img: any) => !removed.some((r: any) => r.url === img.url));
        for (const img of removed) {
          const localPath = path.join("uploads", req.tenant, "servicecatalog-images", path.basename(img.url));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (img.publicId) {
            try { await cloudinary.uploader.destroy(img.publicId); } catch { /* swallow */ }
          }
        }
      } catch (e) {
        logger.withReq.warn(req, t("invalidRemovedImages"), { ...getRequestContext(req), error: e });
      }
    }

    await doc.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req),
      event: "servicecatalog.update",
      module: "servicecatalog",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// --------------------------- GET ALL ---------------------------
export const adminGetAllServiceCatalog = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ServiceCatalog } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const { q, code, category, isActive } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof code === "string" && code.trim()) {
    filter.code = toUpperSnake(code);
  }
  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }
  if (typeof isActive === "string") {
    filter.isActive = isActive === "true";
  }

  // Text search (name.*) — text index var
  const textStage: any[] = [];
  if (typeof q === "string" && q.trim()) {
    filter.$text = { $search: q.trim() };
    // skor görmek istemiyorsan bu kısmı eklemeyebilirsin
    textStage.push({ $addFields: { _score: { $meta: "textScore" } } });
  }

  const query = ServiceCatalog.find(filter)
    .populate([{ path: "category", select: "name slug" }])
    .sort((filter.$text ? { _score: { $meta: "textScore" } } : { createdAt: -1 }))
    .lean();

  const list = await query;
  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// --------------------------- GET BY ID ---------------------------
export const adminGetServiceCatalogById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { ServiceCatalog } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ServiceCatalog.findOne({ _id: id, tenant: req.tenant })
    .populate([{ path: "category", select: "name slug" }])
    .lean();

  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// --------------------------- DELETE ---------------------------
export const deleteServiceCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ServiceCatalog } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await ServiceCatalog.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // local + cloud images temizle
  for (const img of doc.images || []) {
    const localPath = path.join("uploads", req.tenant, "servicecatalog-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if ((img as any).publicId) {
      try { await cloudinary.uploader.destroy((img as any).publicId); } catch { /* ignore */ }
    }
  }

  await doc.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
