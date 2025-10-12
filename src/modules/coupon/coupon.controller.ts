// src/modules/coupon/coupon.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import type { ICouponImage } from "./types";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

/* --------------------------------- helpers --------------------------------- */

const parseIfJson = (value: any) => {
  try { return typeof value === "string" ? JSON.parse(value) : value; }
  catch { return value; }
};

const toDate = (v: any): Date | null => {
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const toBool = (v: any): boolean => (v === true || v === "true" || v === 1 || v === "1");
const toInt = (v: any): number => Number.parseInt(String(v), 10);

const tByReq = (req: Request) => (key: string, params?: any) =>
  translate(key, ((req as any).locale as SupportedLocale) || "en", translations, params);

const tenantOf = (req: Request) => (req as any).tenant as string;

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
/** Yüklenen kupon görseli için disk yolu (URL’den türetir; basename güvenlidir). */
const localPathFromImageUrl = (imageUrl: string, tenant: string) => {
  const fileName = path.basename(imageUrl);
  return path.join(UPLOAD_BASE, tenant, "coupons", fileName);
};

/* --------------------------------- CREATE ---------------------------------- */

export const createCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Coupon } = await getTenantModels(req);

  let { code, title, description, discount, expiresAt, isPublished, publishedAt, isActive } = req.body;

  const discountNum = toInt(discount);
  const expiresAtDate = toDate(expiresAt);
  const published = toBool(isPublished);
  const active = isActive === undefined ? true : toBool(isActive);

  // i18n alanlar
  title = fillAllLocales(parseIfJson(title));
  description = fillAllLocales(parseIfJson(description));

  // Görseller
  const images: ICouponImage[] = [];
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

  const created = await Coupon.create({
    code: String(code || "").toUpperCase().trim(),
    tenant: tenantOf(req),
    title,
    description,
    discount: discountNum,
    expiresAt: expiresAtDate as Date,
    isPublished: published,
    publishedAt: published ? (toDate(publishedAt) || new Date()) : undefined,
    images,
    isActive: active,
  });

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });
  res.status(201).json({ success: true, message: t("created"), data: created });
  return;
});

/* --------------------------------- UPDATE ---------------------------------- */

export const updateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { Coupon } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const coupon = await Coupon.findOne({ _id: id, tenant: tenantOf(req) });
  if (!coupon) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const updates = req.body || {};

  // i18n alanlar
  if (updates.title) coupon.title = mergeLocalesForUpdate(coupon.title as any, parseIfJson(updates.title));
  if (updates.description) coupon.description = mergeLocalesForUpdate(coupon.description as any, parseIfJson(updates.description));

  // primitive alanlar
  // code IMMUTABLE: güncellemeyi yok sayıyoruz; istersen kaldır.
  if (updates.discount !== undefined) coupon.discount = toInt(updates.discount);
  if (updates.expiresAt) coupon.expiresAt = toDate(updates.expiresAt) as Date;
  if (updates.isActive !== undefined) coupon.isActive = toBool(updates.isActive);
  if (updates.isPublished !== undefined) {
    const nextPublished = toBool(updates.isPublished);
    const wasPublished = !!coupon.isPublished;
    coupon.isPublished = nextPublished;
    coupon.publishedAt = nextPublished ? (coupon.publishedAt ?? new Date()) : undefined;
    // first-time publish timestamp set; unpublish'ta temiz (üst satır yaptı)
    if (!wasPublished && nextPublished && !coupon.publishedAt) coupon.publishedAt = new Date();
  }

  // yeni görseller
  if (!Array.isArray(coupon.images)) coupon.images = [];
  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      coupon.images.push({ url: imageUrl, thumbnail, webp, publicId: (file as any).public_id });
    }
  }

  // silinen görseller
  if (updates.removedImages) {
    try {
      const removed: Array<{ url: string; publicId?: string }> =
        typeof updates.removedImages === "string" ? JSON.parse(updates.removedImages) : updates.removedImages;

      // koleksiyondan çıkar
      coupon.images = (coupon.images || []).filter((img: any) => !removed.find(r => r.url === img.url));

      // disk + cloud cleanup
      for (const img of removed) {
        const localPath = localPathFromImageUrl(img.url, tenantOf(req));
        try {
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch { /* ignore */ }
        if (img.publicId) {
          try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ }
        }
      }
    } catch (e) {
      logger.withReq.warn(req, t("invalidRemovedImages"), { ...getRequestContext(req), error: e });
    }
  }

  await coupon.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: coupon.toJSON() });
  return;
});

/* --------------------------------- DELETE ---------------------------------- */

export const deleteCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { Coupon } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const coupon = await Coupon.findOne({ _id: id, tenant: tenantOf(req) });
  if (!coupon) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // Cloud temizliği
  for (const img of coupon.images || []) {
    if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch { /* ignore */ } }
    // Disk temizliği (best-effort)
    try {
      const localPath = localPathFromImageUrl(img.url, tenantOf(req));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch { /* ignore */ }
  }

  await coupon.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ------------------------------- ADMIN LIST -------------------------------- */

export const getAllCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Coupon } = await getTenantModels(req);

  const q = String(req.query.q || "").trim();
  const code = String(req.query.code || "").trim().toUpperCase();
  const isPublished = req.query.isPublished as any;
  const isActive = req.query.isActive as any;

  const query: any = { tenant: tenantOf(req) };
  if (code) query.code = code;
  if (isPublished !== undefined) query.isPublished = (isPublished === "true" || isPublished === true);
  if (isActive !== undefined) query.isActive = (isActive === "true" || isActive === true);

  if (q) {
    const langs = ["tr", "en", "de", "pl", "fr", "es"];
    query.$or = [
      { code: { $regex: q, $options: "i" } },
      ...langs.map(l => ({ [`title.${l}`]: { $regex: q, $options: "i" } })),
      ...langs.map(l => ({ [`description.${l}`]: { $regex: q, $options: "i" } })),
    ];
  }

  const sort = String(req.query.sort || "-createdAt");
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Coupon.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(query),
  ]);

  const data = items.map(c => ({
    ...c,
    title: fillAllLocales(c.title as any),
    description: fillAllLocales(c.description as any),
  }));

  res.status(200).json({
    success: true,
    message: t("listFetched"),
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
  return;
});

/* ---------------------------- PUBLIC: BY CODE ------------------------------- */

export const getCouponByCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { code } = req.params;
  const { Coupon } = await getTenantModels(req);

  const coupon = await Coupon.findOne({
    code: String(code).toUpperCase().trim(),
    tenant: tenantOf(req),
    isActive: true,
  }).lean();

  if (!coupon) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), code });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("fetched"),
    data: {
      ...coupon,
      title: fillAllLocales(coupon.title as any),
      description: fillAllLocales(coupon.description as any),
    },
  });
  return;
});

/* ----------------------------- PUBLIC: LIST -------------------------------- */

export const getCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { Coupon } = await getTenantModels(req);

  const coupons = await Coupon.find({
    tenant: tenantOf(req),
    isPublished: true,
    isActive: true,
  }).lean();

  const data = coupons.map(c => ({
    ...c,
    title: fillAllLocales(c.title as any),
    description: fillAllLocales(c.description as any),
  }));

  res.status(200).json({ success: true, message: t("listFetched"), data });
  return;
});


/* ------------------------------ ADMIN: BY ID ------------------------------- */

export const getCouponByIdAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { Coupon } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Coupon.findOne({ _id: id, tenant: tenantOf(req) }).lean();
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const data = {
    ...doc,
    title: fillAllLocales(doc.title as any),
    description: fillAllLocales(doc.description as any),
  };

  res.status(200).json({ success: true, message: t("fetched"), data });
  return;
});