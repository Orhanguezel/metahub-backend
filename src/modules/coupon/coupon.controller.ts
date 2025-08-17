import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import type { ICouponImage } from "./types";
import { isValidObjectId } from "@/core/utils/validation";
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

// ========== CREATE ==========
export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

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
    tenant: (req as any).tenant,
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
});

// ========== UPDATE ==========
export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const coupon = await Coupon.findOne({ _id: id, tenant: (req as any).tenant });
  if (!coupon) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const updates = req.body;

  // i18n alanlar
  if (updates.title) coupon.title = mergeLocalesForUpdate(coupon.title as any, parseIfJson(updates.title));
  if (updates.description) coupon.description = mergeLocalesForUpdate(coupon.description as any, parseIfJson(updates.description));

  // primitive alanlar
  if (updates.code) coupon.code = String(updates.code).toUpperCase().trim();
  if (updates.discount !== undefined) coupon.discount = toInt(updates.discount);
  if (updates.expiresAt) coupon.expiresAt = toDate(updates.expiresAt) as Date;
  if (updates.isActive !== undefined) coupon.isActive = toBool(updates.isActive);
  if (updates.isPublished !== undefined) {
    const nextPublished = toBool(updates.isPublished);
    coupon.isPublished = nextPublished;
    coupon.publishedAt = nextPublished ? (coupon.publishedAt ?? new Date()) : undefined;
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
      const removed: Array<{ url: string; publicId?: string }> = JSON.parse(updates.removedImages);
      coupon.images = (coupon.images || []).filter((img: any) => !removed.find(r => r.url === img.url));
      for (const img of removed) {
        const localPath = path.join("uploads", (req as any).tenant, "coupons-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch {} }
      }
    } catch (e) {
      logger.withReq.warn(req, t("invalidRemovedImages"), { ...getRequestContext(req), error: e });
    }
  }

  await coupon.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: coupon.toJSON() });
});

// ========== DELETE ==========
export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const coupon = await Coupon.findOne({ _id: id, tenant: (req as any).tenant });
  if (!coupon) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  for (const img of coupon.images || []) {
    if (img.publicId) { try { await cloudinary.uploader.destroy(img.publicId); } catch {} }
  }

  await coupon.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

// ========== ADMIN LIST ==========
export const getAllCoupons = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const q = String(req.query.q || "").trim();
  const code = String(req.query.code || "").trim().toUpperCase();
  const isPublished = req.query.isPublished as any;
  const isActive = req.query.isActive as any;

  const query: any = { tenant: (req as any).tenant };
  if (code) query.code = code;
  if (isPublished !== undefined) query.isPublished = (isPublished === "true" || isPublished === true);
  if (isActive !== undefined) query.isActive = (isActive === "true" || isActive === true);

  if (q) {
    query.$or = [
      { code: { $regex: q, $options: "i" } },
      ...["tr","en","de","pl","fr","es"].map(l => ({ [`title.${l}`]: { $regex: q, $options: "i" } })),
      ...["tr","en","de","pl","fr","es"].map(l => ({ [`description.${l}`]: { $regex: q, $options: "i" } })),
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
});

// ========== PUBLIC BY CODE ==========
export const getCouponByCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const coupon = await Coupon.findOne({
    code: String(code).toUpperCase().trim(),
    tenant: (req as any).tenant,
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
});

// ========== PUBLIC LIST ==========
export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Coupon } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const coupons = await Coupon.find({
    tenant: (req as any).tenant,
    isPublished: true,
    isActive: true,
  }).lean();

  const data = coupons.map(c => ({
    ...c,
    title: fillAllLocales(c.title as any),
    description: fillAllLocales(c.description as any),
  }));

  res.status(200).json({ success: true, message: t("listFetched"), data });
});
