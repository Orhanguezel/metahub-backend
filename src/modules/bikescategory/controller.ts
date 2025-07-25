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
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import slugify from "slugify";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { IBikeCategory } from "./types";

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

      // Çok dilli alanlar için otomatik locale doldurma
      name = fillAllLocales(parseIfJson(name), locale);
      description = fillAllLocales(parseIfJson(description), locale);

      // 2️⃣ Images
      const images: IBikeCategory["images"] = [];
      if (Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
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

      const nameForSlug = name?.[locale] || name?.en;
      const slug = slugify(nameForSlug, { lower: true, strict: true });

      // 3️⃣ Kayıt ekle
      const category = await BikeCategory.create({
        name,
        description,
        slug,
        tenant: req.tenant,
        images,
        isActive: true,
      });

      logger.withReq.info(req, t("create.success"), {
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
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "category.create",
        module: "bikeCategory",
        status: "fail",
        error: err.message,
      });

      // Eğer duplicate key ise daha anlamlı mesaj!
      if (err.code === 11000 && err.keyPattern?.slug) {
        res.status(409).json({
          success: false,
          message: t("error.slug_duplicate") || "Slug already exists.",
          error: err.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: t("error.create_fail"),
        error: err.message,
      });
    }
  }
);

// ✅ FINAL: updateBikeCategory
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

    // Çok dilli alanlar
    if (updates.name !== undefined) {
      const parsedName = parseIfJson(updates.name);
      category.name = fillAllLocales(parsedName, locale);
      const nameForSlug = parsedName?.[locale] || parsedName?.en;
      if (nameForSlug) {
        category.slug = slugify(nameForSlug, { lower: true, strict: true });
      }
    }
    if (updates.description !== undefined) {
      category.description = fillAllLocales(
        parseIfJson(updates.description),
        locale
      );
    }

    // Diğer alanlar
    const directFields: (keyof IBikeCategory)[] = ["isActive"];
    for (const field of directFields) {
      if (updates[field] !== undefined) {
        (category as any)[field] = parseIfJson(updates[field]);
      }
    }

    // Yeni yüklenen görselleri ekle
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
        let removed: string[] = [];
        if (typeof updates.removedImages === "string") {
          if (updates.removedImages.trim().startsWith("[")) {
            removed = JSON.parse(updates.removedImages);
          } else {
            removed = [updates.removedImages];
          }
        } else if (Array.isArray(updates.removedImages)) {
          removed = updates.removedImages;
        }

        for (const imgUrl of removed) {
          // ilgili img objesini bul
          const imgObj = category.images.find((img) => img.url === imgUrl);
          if (imgObj) {
            const localPath = path.join(
              "uploads",
              req.tenant,
              "bikeCategory-images",
              path.basename(imgObj.url)
            );
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            if (imgObj.publicId) {
              try {
                await cloudinary.uploader.destroy(imgObj.publicId);
              } catch (err) {
                console.error("Cloudinary delete error:", err);
              }
            }
          }
        }

        // listeden kaldır
        category.images = category.images.filter(
          (img) => !removed.includes(img.url)
        );
      } catch (e) {
        console.warn("Invalid removedImages JSON:", e);
      }
    }

    await category.save();

    logger.withReq.info(req, t("update.success"), {
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

    const filter: Record<string, any> = { tenant: req.tenant };
    if (req.query.isActive) filter.isActive = req.query.isActive === "true";

    const categories = await BikeCategory.find(filter).sort({
      createdAt: -1,
    });

    logger.withReq.info(req, t("fetchAll.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "fetchAll",
      count: categories.length,
    });

    res.status(200).json({
      success: true,
      message: t("fetchAll.success"),
      data: categories, // Tüm diller + images!
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

    logger.withReq.info(req, t("fetch.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "fetch",
      categoryId: id,
    });

    res.status(200).json({
      success: true,
      message: t("fetch.success"),
      data: category, // Tüm diller + images!
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
        req.tenant,
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

    logger.withReq.info(req, t("delete.success"), {
      ...getRequestContext(req),
      module: "bikeCategory",
      event: "delete",
      categoryId: id,
    });

    res.status(200).json({ success: true, message: t("delete.success") });
  }
);
