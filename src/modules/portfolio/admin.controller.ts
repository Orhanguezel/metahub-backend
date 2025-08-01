import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IPortfolio } from "@/modules/portfolio/types";
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
import faq from "../faq";

// ...importlar (değişmedi)

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// 🔒 Güvenli array normalization fonksiyonu
function normalizePortfolioItem(item: any) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

// ✅ CREATE
export const createPortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Portfolio } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      let {
        title,
        summary,
        content,
        tags,
        category,
        isPublished,
        publishedAt,
      } = req.body;

      title = fillAllLocales(parseIfJson(title));
      summary = fillAllLocales(parseIfJson(summary));
      content = fillAllLocales(parseIfJson(content));
      tags = parseIfJson(tags);

      tags = parseIfJson(tags);
      if (typeof tags === "string") {
        try {
          tags = JSON.parse(tags);
        } catch {
          tags = [tags];
        }
      }
      if (!Array.isArray(tags)) tags = [];

      const images: IPortfolio["images"] = [];
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

      const nameForSlug = title?.[locale] || title?.en || "portfolio";
      const slug = slugify(nameForSlug, { lower: true, strict: true });

      const portfolio = await Portfolio.create({
        title,
        slug,
        summary,
        tenant: req.tenant,
        content,
        tags,
        category,
        isPublished: isPublished === "true" || isPublished === true,
        publishedAt: isPublished ? publishedAt || new Date() : undefined,
        images,
        author: req.user?.name || "System",
        isActive: true,
      });

      logger.withReq.info(req, t("created"), {
        ...getRequestContext(req),
        id: portfolio._id,
      });

      // --- Normalization burada da uygulanabilir ---
      const safePortfolio = normalizePortfolioItem(portfolio.toObject());

      res.status(201).json({ success: true, message: t("created"), data: safePortfolio });
    } catch (err: any) {
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "portfolio.create",
        module: "portfolio",
        status: "fail",
        error: err.message,
      });
      res.status(500).json({ success: false, message: t("error.create_fail") });
    }
  }
);

// ✅ UPDATE
export const updatePortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Portfolio } = await getTenantModels(req);
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

    const portfolio = await Portfolio.findOne({ _id: id, tenant: req.tenant });
    if (!portfolio) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const updates = req.body;
    if (updates.title) {
      portfolio.title = mergeLocalesForUpdate(
        portfolio.title,
        parseIfJson(updates.title)
      );
    }
    if (updates.summary) {
      portfolio.summary = mergeLocalesForUpdate(
        portfolio.summary,
        parseIfJson(updates.summary)
      );
    }
    if (updates.content) {
      portfolio.content = mergeLocalesForUpdate(
        portfolio.content,
        parseIfJson(updates.content)
      );
    }

    // Array güvenliği
    if (updates.tags !== undefined) {
      let tags = parseIfJson(updates.tags);
      if (typeof tags === "string") {
        try {
          tags = JSON.parse(tags);
        } catch {
          tags = [tags];
        }
      }
      if (!Array.isArray(tags)) tags = [];
      portfolio.tags = tags;
    }

    const updatableFields: (keyof IPortfolio)[] = [
      "category",
      "isPublished",
      "publishedAt",
    ];
    for (const field of updatableFields) {
      if (updates[field] !== undefined)
        (portfolio as any)[field] = updates[field];
    }

    if (!Array.isArray(portfolio.images)) portfolio.images = [];
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
        portfolio.images.push({
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
        portfolio.images = portfolio.images.filter(
          (img: any) => !removed.includes(img.url)
        );
        for (const img of removed) {
          const localPath = path.join(
            "uploads",
            req.tenant,
            "portfolio-images",
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

    await portfolio.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });

    // --- Normalization ---
    const safePortfolio = normalizePortfolioItem(portfolio.toObject());
    res.status(200).json({ success: true, message: t("updated"), data: safePortfolio });
  }
);

// ✅ GET ALL (array normalization)
export const adminGetAllPortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Portfolio } = await getTenantModels(req);
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

    if (typeof isPublished === "string") {
      filter.isPublished = isPublished === "true";
    }

    if (typeof isActive === "string") {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true;
    }

    const portfolioList = await Portfolio.find(filter)
      .populate([{ path: "comments", strictPopulate: false }])
      .sort({ createdAt: -1 })
      .lean();

    // --- Güvenli array normalization ---
    const data = (portfolioList || []).map(normalizePortfolioItem);

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: data.length,
    });
    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

// ✅ GET BY ID (tekil normalization)
export const adminGetPortfolioById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Portfolio } = await getTenantModels(req);
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

    const portfolio = await Portfolio.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }])
      .lean();

    if (!portfolio || Array.isArray(portfolio) || !portfolio.isActive) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    // --- Güvenli array normalization ---
    const populated = normalizePortfolioItem(portfolio);

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: populated,
    });
  }
);

// ✅ DELETE (array safety gerekmiyor, loop için öneri var)
export const deletePortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Portfolio } = await getTenantModels(req);
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

    const portfolio = await Portfolio.findOne({ _id: id, tenant: req.tenant });
    if (!portfolio) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    for (const img of Array.isArray(portfolio.images) ? portfolio.images : []) {
      const localPath = path.join(
        "uploads",
        req.tenant,
        "portfolio-images",
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

    await portfolio.deleteOne();

    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
