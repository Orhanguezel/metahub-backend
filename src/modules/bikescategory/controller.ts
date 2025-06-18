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
} from "@/core/utils/uploadUtils";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import slugify from "slugify";
import translations from "./i18n";
import { IBikeCategory } from "./types";

// Yardımcı
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE
export const createBikeCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { BikeCategory } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, string | number>) =>
      translate(key, locale, translations, vars);

    try {
      let { name, description } = req.body;
      name = fillAllLocales(parseIfJson(name));
      description = fillAllLocales(parseIfJson(description));

      // Görsel işlemleri
      const images: IBikeCategory["images"] = [];
      if (Array.isArray(req.files)) {
        for (const [index, file] of (
          req.files as Express.Multer.File[]
        ).entries()) {
          let imageUrl = getImagePath(file);
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

      const nameForSlug = name?.[locale] || name?.en || "bikeCategory";
      const slug = slugify(nameForSlug, { lower: true, strict: true });

      const category = await BikeCategory.create({
        name,
        description,
        slug,
        tenant: req.tenant,
        images,
        isActive: true,
      });

      logger.info(t("create.success"), {
        ...getRequestContext(req),
        module: "bikeCategory",
        event: "create",
        categoryId: category._id,
      });

      res.status(201).json({
        success: true,
        message: t("create.success"),
        data: category,
      });
    } catch (err: any) {
      logger.error(t("error.create_fail"), {
        ...getRequestContext(req),
        event: "category.create",
        module: "bikeCategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("error.create_fail"),
        error: err.message,
      });
    }
  }
);

// ✅ UPDATE
export const updateBikeCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { BikeCategory } = await getTenantModels(req);
    const t = (key: string, vars?: Record<string, any>) =>
      translate(key, locale, translations, vars);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const category = await BikeCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      res.status(404).json({ success: false, message: t("error.notFound") });
      return;
    }

    // Çok dilli alanlar (gelen dil güncellenir, kalanlar korunur)
    if (updates.name !== undefined) {
      category.name = fillAllLocales(parseIfJson(updates.name));
    }
    if (updates.description !== undefined) {
      category.description = fillAllLocales(parseIfJson(updates.description));
    }
    if (typeof updates.isActive !== "undefined") {
      category.isActive =
        updates.isActive === "true" || updates.isActive === true;
    }

    // Slug'ı tekrar üret (örn. eğer name değiştiyse!)
    let nameForSlug =
      category.name[locale] ||
      category.name.en ||
      Object.values(category.name).find((v) => !!v) ||
      "category";
    category.slug = slugify(nameForSlug, { lower: true, strict: true });

    // Görselleri güncelle (yeni dosya varsa eskiyi sil)
    if (Array.isArray(req.files) && req.files.length > 0) {
      // Eski görselleri sil
      for (const old of category.images || []) {
        if (old?.url) {
          const localPath = path.join(
            "uploads",
            "bikeCategory",
            path.basename(old.url)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        if (old?.publicId) {
          await cloudinary.uploader.destroy(old.publicId);
        }
      }

      // Görseller
      if (!Array.isArray(category.images)) category.images = [];
      if (Array.isArray(req.files)) {
        for (const [index, file] of (
          req.files as Express.Multer.File[]
        ).entries()) {
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

          category.images.push({
            url: imageUrl,
            thumbnail,
            webp,
            publicId: (file as any).public_id,
          });
        }
      }

      // Silinen görseller
      if (updates.removedImages) {
        try {
          const removed = JSON.parse(updates.removedImages);
          category.images = category.images.filter(
            (img: any) => !removed.includes(img.url)
          );
          for (const img of removed) {
            const localPath = path.join(
              "uploads",
              "bikeCategory",
              path.basename(img.url)
            );
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
          }
        } catch (e) {
          console.warn("Invalid removedImages JSON:", e);
        }
      }
    }

    await category.save();

    logger.info(t("update.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "update",
      categoryId: id,
    });

    res.status(200).json({
      success: true,
      message: t("update.success"),
      data: category,
    });
  }
);

// ✅ GET ALL
export const getAllBikeCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const { BikeCategory } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    const categories = await BikeCategory.find({ tenant: req.tenant }).sort({
      createdAt: -1,
    });

    if (!categories || categories.length === 0) {
      logger.warn(t("fetchAll.empty"), {
        ...getRequestContext(req),
        module: "bikeCategory",
        event: "fetchAll",
        status: "empty",
      });
    }

    logger.info(t("fetchAll.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "fetchAll",
      count: categories.length,
    });

    res.status(200).json({
      success: true,
      message: t("fetchAll.success"),
      data: categories,
    });
  }
);

// ✅ GET BY ID
export const getBikeCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const { BikeCategory } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalidId") });
      return;
    }

    const category = await BikeCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      res.status(404).json({ success: false, message: t("error.notFound") });
      return;
    }

    logger.info(t("fetch.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "fetch",
      categoryId: id,
    });

    res.status(200).json({
      success: true,
      message: t("fetch.success"),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteBikeCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const { BikeCategory } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("error.invalidId") });
      return;
    }

    const category = await BikeCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      res.status(404).json({ success: false, message: t("error.notFound") });
      return;
    }

    // Eski görselleri sil
    for (const img of category.images || []) {
      const localPath = path.join(
        "uploads",
        "bikeCategory",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
    }

    await category.deleteOne();

    logger.info(t("delete.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "delete",
      categoryId: id,
    });

    res.status(200).json({ success: true, message: t("delete.success") });
  }
);
