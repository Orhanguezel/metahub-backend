import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ICoupon, ICouponImage } from "./types";
import { isValidObjectId } from "@/core/utils/validation";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { SupportedLocale } from "@/types/common";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE - Coupon Creation with Images
export const createCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en"; // Default to "en" if locale is undefined.
    const { Coupon } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    let {
      code,
      title,
      description,
      discount,
      expiresAt,
      isPublished,
      publishedAt,
      isActive,
    } = req.body;

    title = fillAllLocales(parseIfJson(title)); // Çoklu dil desteği
    description = fillAllLocales(parseIfJson(description)); // Çoklu dil desteği

    // Resimleri işle
    const images: ICouponImage[] = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(
            file.path,
            file.filename,
            path.dirname(file.path)
          );
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

    const coupon = await Coupon.create({
      code,
      tenant: req.tenant,
      title,
      description,
      discount,
      expiresAt,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
      images,
      isActive: true,
    });

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: coupon._id,
    });
    res
      .status(201)
      .json({ success: true, message: t("created"), data: coupon });
  }
);

// ✅ UPDATE - Coupon Update with Image Handling
export const updateCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || "en";
    const { Coupon } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("invalidId"), {
        ...getRequestContext(req),
        id,
      });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const coupon = await Coupon.findOne({ _id: id, tenant: req.tenant });
    if (!coupon) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const updates = req.body;
    if (updates.title) {
      coupon.title = mergeLocalesForUpdate(
        coupon.title,
        parseIfJson(updates.title)
      );
    }
    if (updates.description) {
      coupon.description = mergeLocalesForUpdate(
        coupon.description,
        parseIfJson(updates.description)
      );
    }

    if (updates.discount) coupon.discount = updates.discount;
    if (updates.expiresAt) coupon.expiresAt = updates.expiresAt;
    if (updates.isActive !== undefined) coupon.isActive = updates.isActive;

    // Handle images
    if (!Array.isArray(coupon.images)) coupon.images = [];
    if (Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const imageUrl = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
        if (shouldProcessImage()) {
          const processed = await processImageLocal(
            file.path,
            file.filename,
            path.dirname(file.path)
          );
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }
        coupon.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // Handle removed images
    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        coupon.images = coupon.images.filter(
          (img: any) => !removed.includes(img.url)
        );
        for (const img of removed) {
          const localPath = path.join(
            "uploads",
            "coupons-images",
            path.basename(img.url)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
        }
      } catch (e) {
        logger.withReq.warn(req, t("invalidRemovedImages"), {
          ...getRequestContext(req),
          error: e,
        });
      }
    }

    await coupon.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res
      .status(200)
      .json({ success: true, message: t("updated"), data: coupon });
  }
);

// ✅ DELETE - Coupon Delete
export const deleteCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Coupon } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || "en";
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("invalidId"), {
        ...getRequestContext(req),
        id,
      });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const coupon = await Coupon.findOne({ _id: id, tenant: req.tenant });
    if (!coupon) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    // Delete images from Cloudinary
    for (const img of coupon.images || []) {
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          logger.withReq.error(req, t("Cloudinary delete error"), {
            ...getRequestContext(req),
            publicId: img.publicId,
          });
        }
      }
    }

    await coupon.deleteOne();
    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);

// ✅ GET ALL - ADMIN (tüm kuponlar, publish/aktif farketmez)
export const getAllCoupons = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { Coupon } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    // Burada query ile admin filtreleri uygulayabilirsin
    // (örn. isPublished, isActive, expiresAt, code vs.)
    const query: any = { tenant: req.tenant };
    if (req.query.isPublished !== undefined) query.isPublished = req.query.isPublished;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive;
    // Diğer filtreler (isteğe bağlı)

    const coupons = await Coupon.find(query).lean();

    const data = coupons.map((coupon) => ({
      ...coupon,
      title: fillAllLocales(coupon.title),
      description: fillAllLocales(coupon.description),
    }));

    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);


// ✅ GET BY CODE - Public
export const getCouponByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;
    const locale: SupportedLocale = req.locale || "en";
    const { Coupon } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const coupon = await Coupon.findOne({
      code,
      tenant: req.tenant,
      isActive: true,
    }).lean();

    if (!coupon) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        code,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: t("fetched"), data: coupon });
  }
);

// ✅ GET ALL - PUBLIC (published, active)
export const getCoupons = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const { Coupon } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    // Sadece yayınlanmış ve aktif olanlar:
    const coupons = await Coupon.find({
      tenant: req.tenant,
      isPublished: true,
      isActive: true,
    }).lean();

    const data = coupons.map((coupon) => ({
      ...coupon,
      title: fillAllLocales(coupon.title),
      description: fillAllLocales(coupon.description),
    }));

    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

