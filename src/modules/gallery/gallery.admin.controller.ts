import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import {
  processImageLocal,
  getImagePath,
  shouldProcessImage,
  getFallbackThumbnail,
} from "@/core/utils/uploadUtils";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { extractMultilangValue } from "@/core/utils/i18n/parseMultilangField";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { IGalleryItem } from "./types";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

export const createGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    let { title, description, category, type = "image" } = req.body;
    title = fillAllLocales(parseIfJson(title));
    description = fillAllLocales(parseIfJson(description));

    if (!category || !isValidObjectId(category)) {
      res
        .status(400)
        .json({ success: false, message: "Valid category ID is required." });
      return;
    }

    const images: IGalleryItem["items"] = [];
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
          image: imageUrl,
          thumbnail,
          webp,
          title,
          description,
          order: 0,
        });
      }
    }

    const baseTitle =
      SUPPORTED_LOCALES.map((l) => title[l]).find((val) => val?.trim()) ||
      "gallery";
    const slug = slugify(baseTitle, { lower: true, strict: true });

    const galleryItem = await Gallery.create({
      tenant: req.tenant,
      category: isValidObjectId(category) ? category : undefined,
      type,
      isPublished: true, // defaults to true
      isActive: true,    // defaults to true
      priority: 0,      // defaults to 0
      items: images,
    });

    res.status(201).json({
      success: true,
      message: t("created"),
      data: galleryItem,
    });
  }
);

export const updateGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const { category, type, isPublished, priority, title, description, order } =
      req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const gallery = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!gallery) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    if (category && isValidObjectId(category)) gallery.category = category;
    if (type) gallery.type = type;
    if (isPublished !== undefined) gallery.isPublished = isPublished;
    if (priority !== undefined) gallery.priority = parseInt(priority);

    // Handling updates for gallery subitems
    if (gallery.items.length > 0) {
      const firstItem = gallery.items[0];
      firstItem.title = mergeLocalesForUpdate(title, SUPPORTED_LOCALES);
      firstItem.description = mergeLocalesForUpdate(description, SUPPORTED_LOCALES);
      firstItem.order = order ? parseInt(order) : firstItem.order;
    }

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
        gallery.items.push({
          image: imageUrl,
          thumbnail,
          webp,
          title: mergeLocalesForUpdate(title, SUPPORTED_LOCALES),
          description: mergeLocalesForUpdate(description, SUPPORTED_LOCALES),
          order: 0,
        });
      }
    }

    await gallery.save();
    res.status(200).json({
      success: true,
      message: t("updated"),
      data: gallery,
    });
  }
);


export const getAllGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
    const { language, isPublished, isActive, page = "1", limit = "10", category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const filters: any = { tenant: req.tenant };

    if (
      typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
    ) {
      filters[`title.${language}`] = { $exists: true };
    }

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
      message: "Gallery items fetched successfully.",
      data: items,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);

export const softDeleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Gallery } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    item.isActive = false;
    await item.save();

    res
      .status(200)
      .json({ success: true, message: "Media item archived successfully." });
  }
);

export const deleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Gallery } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.deleteOne({
      _id: id,
      tenant: req.tenant,
    }).lean();
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Media deleted successfully." });
  }
);




// ✅ Toggle publish status for a gallery item
export const togglePublishGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || "en"; // Default to 'en' if locale is undefined
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    // Validate gallery ID
    if (!isValidObjectId(id)) {
       res.status(400).json({ success: false, message: t("invalidGalleryId") });return;
    }

    // Find gallery item
    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
       res.status(404).json({ success: false, message: t("galleryItemNotFound") });return;
    }

    // Toggle publish status
    item.isPublished = !item.isPublished;
    await item.save();

    res.status(200).json({
      success: true,
      message: item.isPublished ? t("galleryItemPublished") : t("galleryItemUnpublished"),
      data: item,
    });
  }
);

// ✅ Batch publish gallery items
export const batchPublishGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { ids, publish } = req.body;
    const locale: SupportedLocale = req.locale || "en";
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!Array.isArray(ids) || typeof publish !== "boolean") {
       res.status(400).json({ success: false, message: t("invalidRequestBody") });return;
    }

    const updated = await Gallery.updateMany(
      { _id: { $in: ids }, tenant: req.tenant },
      { $set: { isPublished: publish } }
    );

    res.status(200).json({
      success: true,
      message: t("batchGalleryItemsPublished"),
    });
  }
);

// ✅ Batch delete gallery items permanently
export const batchDeleteGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    const locale: SupportedLocale = req.locale || "en";
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    if (!Array.isArray(ids)) {
       res.status(400).json({ success: false, message: t("invalidRequestBody") });return;
    }

    const result = await Gallery.deleteMany({
      _id: { $in: ids },
      tenant: req.tenant,
    });

    res.status(200).json({
      success: true,
      message: t("batchGalleryItemsDeleted"),
    });
  }
);








