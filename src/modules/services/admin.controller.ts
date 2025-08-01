import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IServices } from "@/modules/services/types";
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

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE
export const createServices = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Services } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      let {
        title,
        summary,
        content,
        tags,
        durationMinutes,
        price,
        category,
        isPublished,
        publishedAt,
      } = req.body;

      title = fillAllLocales(parseIfJson(title));
      summary = fillAllLocales(parseIfJson(summary));
      content = fillAllLocales(parseIfJson(content));
      tags = parseIfJson(tags);

      // String diziler: virgüllü veya JSON array olarak gelebilir!
      tags = parseIfJson(tags);
      if (typeof tags === "string") {
        try {
          tags = JSON.parse(tags);
        } catch {
          tags = [tags];
        }
      }
      if (!Array.isArray(tags)) tags = [];

      const images: IServices["images"] = [];
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

      const nameForSlug = title?.[locale] || title?.en || "services";
      const slug = slugify(nameForSlug, { lower: true, strict: true });

      const services = await Services.create({
        title,
        slug,
        summary,
        tenant: req.tenant,
        content,
        tags,
        durationMinutes: durationMinutes
          ? parseFloat(durationMinutes)
          : undefined,
        price: price ? parseFloat(price) : undefined,
        category: isValidObjectId(category) ? category : undefined,
        isPublished: isPublished === "true" || isPublished === true,
        publishedAt: isPublished ? publishedAt || new Date() : undefined,
        images,
        author: req.user?.name || "System",
        isActive: true,
      });

      logger.withReq.info(req, t("created"), {
        ...getRequestContext(req),
        id: services._id,
      });
      res
        .status(201)
        .json({ success: true, message: t("created"), data: services });
    } catch (err: any) {
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "services.create",
        module: "services",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({ success: false, message: t("error.create_fail") });
    }
  }
);

// ✅ UPDATE
export const updateServices = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Services } = await getTenantModels(req);
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

    const services = await Services.findOne({ _id: id, tenant: req.tenant });
    if (!services) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const updates = req.body;
    if (updates.title) {
      services.title = mergeLocalesForUpdate(
        services.title,
        parseIfJson(updates.title)
      );
    }
    if (updates.summary) {
      services.summary = mergeLocalesForUpdate(
        services.summary,
        parseIfJson(updates.summary)
      );
    }
    if (updates.content) {
      services.content = mergeLocalesForUpdate(
        services.content,
        parseIfJson(updates.content)
      );
    }

    const updatableFields: (keyof IServices)[] = [
      "tags",
      "category",
      "isPublished",
      "publishedAt",
      "durationMinutes",
      "price",
    ];
    for (const field of updatableFields) {
      if (updates[field] !== undefined)
        (services as any)[field] = updates[field];
    }

    if (!Array.isArray(services.images)) services.images = [];
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
        services.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        services.images = services.images.filter(
          (img: any) => !removed.includes(img.url)
        );
        for (const img of removed) {
          const localPath = path.join(
            "uploads",
            req.tenant,
            "services-images",
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

    await services.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res
      .status(200)
      .json({ success: true, message: t("updated"), data: services });
  }
);

// ✅ GET ALL
export const adminGetAllServices = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Services } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
    const { language, category, isPublished, isActive } = req.query;
    const filter: Record<string, any> = {
      tenant: req.tenant,
    };

    if (
      typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
    ) {
      filter[`title.${language}`] = { $exists: true };
    }

    if (typeof category === "string" && isValidObjectId(category)) {
      filter.category = category;
    }

    if (typeof isPublished === "string") {
      filter.isPublished = isPublished === "true";
    }

    if (typeof isActive === "string") {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true;
    }

    const servicesList = await Services.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const data = servicesList;

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: data.length,
    });
    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

// ✅ GET BY ID
export const adminGetServicesById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Services } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("invalidId"), {
        ...getRequestContext(req),
        id,
      });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const services = await Services.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!services || Array.isArray(services) || !services.isActive) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const populated = services as any;

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: populated,
    });
  }
);

// ✅ DELETE
export const deleteServices = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Services } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("invalidId"), {
        ...getRequestContext(req),
        id,
      });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const services = await Services.findOne({ _id: id, tenant: req.tenant });
    if (!services) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    for (const img of services.images || []) {
      const localPath = path.join(
        "uploads",
        req.tenant,
        "services-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
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

    await services.deleteOne();

    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
