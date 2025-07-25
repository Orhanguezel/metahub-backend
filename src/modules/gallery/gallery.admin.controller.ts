import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
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
import { IGallery, IGalleryItem } from "./types";

// Utility
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ Create Gallery Item
export const createGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, any>) =>
      translate(key, locale, translations, vars);

    try {
      let { name, description, category, type = "image", order } = req.body;

      name = fillAllLocales(parseIfJson(name));
      description = fillAllLocales(parseIfJson(description));

      if (!category || !isValidObjectId(category)) {
        res.status(400).json({
          success: false,
          message: t("error.validCategoryRequired"),
        });
        return;
      }

      const images: IGallery["images"] = [];

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
            name: fillAllLocales({ [locale]: file.originalname }),
            description: fillAllLocales({ [locale]: "" }),
            order: order ? Number(order) : 0,
          });
        }
      }

      const gallery = await Gallery.create({
        tenant: req.tenant,
        category,
        type,
        isPublished: true,
        isActive: true,
        priority: 0,
        images,
      });

      logger.withReq.info(req, t("create.success"), {
        ...getRequestContext(req),
        module: "gallery",
        event: "create",
        galleryId: gallery._id.toString(),
      });

      res.status(201).json({
        success: true,
        message: t("create.success"),
        data: gallery,
      });
    } catch (error: any) {
      logger.withReq.error(req, t("error.creating_item"), {
        ...getRequestContext(req),
        module: "gallery",
        event: "create",
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: t("error.creating_item"),
        error: error.message,
      });
    }
  }
);
// ✅ Update Gallery Item (EXACT & MODERN & FUTURE-PROOF)
export const updateGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, any>) =>
      translate(key, locale, translations, vars);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const gallery = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!gallery) {
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    const updates = req.body;

    try {
      let {
        name,
        description,
        category,
        type,
        isPublished,
        isActive,
        priority,
        order,
        existingImages, // frontend'den gelen (korunacak) url dizisi
        removedImages, // frontend'den gelen (silinen) url dizisi
      } = updates;

      // ---------- IMAGE UPDATE LOGIC BAŞLANGIÇ ----------
      // Resim array güvenliği
      if (!Array.isArray(gallery.images)) gallery.images = [];

      // Multer fields() (object: {images:[], ...}) desteği
      if (
        req.files &&
        typeof req.files === "object" &&
        !Array.isArray(req.files)
      ) {
        // Images
        if (Array.isArray((req.files as any)["images"])) {
          for (const file of (req.files as any)["images"]) {
            if (file.mimetype && file.mimetype.startsWith("image/")) {
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
              gallery.images.push({
                url: imageUrl,
                thumbnail,
                webp,
                publicId: (file as any).public_id,
                name: fillAllLocales({ [locale]: file.originalname }),
                description: fillAllLocales({ [locale]: "" }),
                order: order ? Number(order) : 0,
              });
            }
          }
        }
      }

      // Multer array() desteği
      if (Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          if (
            file.fieldname === "images" &&
            file.mimetype &&
            file.mimetype.startsWith("image/")
          ) {
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
            gallery.images.push({
              url: imageUrl,
              thumbnail,
              webp,
              publicId: (file as any).public_id,
              name: fillAllLocales({ [locale]: file.originalname }),
              description: fillAllLocales({ [locale]: "" }),
              order: order ? Number(order) : 0,
            });
          }
        }
      }

      // --- IMAGE REMOVE (tamamen güvenli, hem diziden hem cloud hem lokal sil) ---
      if (removedImages) {
        try {
          const removed: string[] = Array.isArray(removedImages)
            ? removedImages
            : typeof removedImages === "string"
            ? JSON.parse(removedImages)
            : [];
          for (const imgUrl of removed) {
            const imgIdx = gallery.images.findIndex(
              (i: any) => i.url === imgUrl
            );
            if (imgIdx > -1) {
              const imgObj = gallery.images[imgIdx];
              // Lokalde ise sil
              const localPath = path.join(
                "uploads",
                req.tenant,
                "gallery-images",
                path.basename(imgUrl)
              );
              if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
              // Cloudinary'de ise sil
              if (imgObj?.publicId)
                await cloudinary.uploader.destroy(imgObj.publicId);
              // Diziden çıkar
              gallery.images.splice(imgIdx, 1);
            }
          }
        } catch (e) {
          logger.withReq.warn(req, t("invalidRemovedImages"), {
            ...getRequestContext(req),
            error: e,
          });
        }
      }

      // --- Kalan resimler (korunacaklar) sadece existingImages ile güncellensin (Opsiyonel, eğer frontend yolluyorsa!) ---
      if (existingImages) {
        let keepUrls: string[] = Array.isArray(existingImages)
          ? existingImages
          : typeof existingImages === "string"
          ? JSON.parse(existingImages)
          : [];
        if (keepUrls.length > 0) {
          gallery.images = gallery.images.filter((img) =>
            keepUrls.includes(img.url)
          );
        }
      }
      // ---------- IMAGE UPDATE LOGIC SONU ----------

      // 5️⃣ Name/Description/Order: Sadece tekli resim güncelliyorsa uygula, çoklu ise her bir resim frontend'den ayrı güncellenmeli.
      if (name && gallery.images.length === 1) {
        gallery.images[0].name = mergeLocalesForUpdate(
          gallery.images[0].name,
          parseIfJson(name)
        );
      }
      if (description && gallery.images.length === 1) {
        gallery.images[0].description = mergeLocalesForUpdate(
          gallery.images[0].description,
          parseIfJson(description)
        );
      }
      if (order !== undefined) {
        gallery.images.forEach((img) => (img.order = Number(order)));
      }

      // 6️⃣ Diğer ana alanlar
      if (category && isValidObjectId(category)) gallery.category = category;
      if (type) gallery.type = type;
      if (isPublished !== undefined)
        gallery.isPublished = isPublished === "true" || isPublished === true;
      if (isActive !== undefined)
        gallery.isActive = isActive === "true" || isActive === true;
      if (priority !== undefined) gallery.priority = parseInt(priority);

      await gallery.save();

      logger.withReq.info(req, t("update.success"), {
        ...getRequestContext(req),
        module: "gallery",
        event: "update",
        galleryId: id,
      });

      res.status(200).json({
        success: true,
        message: t("update.success"),
        data: gallery,
      });
    } catch (error: any) {
      logger.withReq.error(req, t("error.updating_item"), {
        ...getRequestContext(req),
        module: "gallery",
        event: "update",
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: t("error.updating_item"),
        error: error.message,
      });
    }
  }
);

export const getAllGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const {
        isPublished,
        isActive,
        page = "1",
        limit = "100",
        category,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const filters: any = { tenant: req.tenant };

      if (category && isValidObjectId(category as string)) {
        filters.category = category;
      }
      if (typeof isPublished === "string") {
        filters.isPublished = isPublished === "true";
      }
      if (typeof isActive === "string") {
        filters.isActive = isActive === "true";
      } else {
        filters.isActive = true;
      }

      const [items, total] = await Promise.all([
        Gallery.find(filters)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("category")
          .lean(),
        Gallery.countDocuments(filters),
      ]);

      res.status(200).json({
        success: true,
        message: t("fetch.success"),
        data: items,
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_items"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_items") });
    }
  }
);

export const softDeleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: t("error.invalid_id") });
        return;
      }

      const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
      if (!item) {
        res.status(404).json({ success: false, message: t("error.not_found") });
        return;
      }

      item.isActive = false;
      await item.save();

      res.status(200).json({
        success: true,
        message: t("archive.success"),
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.archiving_item"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.archiving_item") });
    }
  }
);

export const deleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: t("error.invalid_id") });
        return;
      }

      const result = await Gallery.deleteOne({ _id: id, tenant: req.tenant });
      if (result.deletedCount === 0) {
        res.status(404).json({ success: false, message: t("error.not_found") });
        return;
      }

      res.status(200).json({
        success: true,
        message: t("delete.success"),
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.deleting_item"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.deleting_item") });
    }
  }
);

export const togglePublishGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: t("error.invalid_id") });
        return;
      }

      const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
      if (!item) {
        res.status(404).json({ success: false, message: t("error.not_found") });
        return;
      }

      item.isPublished = !item.isPublished;
      await item.save();

      res.status(200).json({
        success: true,
        message: item.isPublished
          ? t("publish.success")
          : t("unpublish.success"),
        data: item,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.toggling_publish"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.toggling_publish") });
    }
  }
);

export const batchPublishGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { ids, publish } = req.body;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      if (!Array.isArray(ids) || typeof publish !== "boolean") {
        res
          .status(400)
          .json({ success: false, message: t("error.invalid_body") });
        return;
      }

      await Gallery.updateMany(
        { _id: { $in: ids }, tenant: req.tenant },
        { $set: { isPublished: publish } }
      );

      res.status(200).json({
        success: true,
        message: publish
          ? t("publish.success_all")
          : t("unpublish.success_all"),
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.batch_publish"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.batch_publish") });
    }
  }
);

export const batchDeleteGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      if (!Array.isArray(ids)) {
        res
          .status(400)
          .json({ success: false, message: t("error.invalid_body") });
        return;
      }

      await Gallery.deleteMany({ _id: { $in: ids }, tenant: req.tenant });

      res.status(200).json({
        success: true,
        message: t("delete.success_all"),
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.batch_delete"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.batch_delete") });
    }
  }
);
