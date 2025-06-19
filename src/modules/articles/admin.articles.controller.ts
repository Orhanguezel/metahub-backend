import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IArticles } from "@/modules/articles/types";
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
} from "@/core/utils/uploadUtils";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { extractMultilangValue } from "@/core/utils/i18n/parseMultilangField";
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
export const createArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();

    const { Articles } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    let { title, summary, content, tags, category, isPublished, publishedAt } =
      req.body;

    title = fillAllLocales(parseIfJson(title));
    summary = fillAllLocales(parseIfJson(summary));
    content = fillAllLocales(parseIfJson(content));
    tags = parseIfJson(tags);

    const images: IArticles["images"] = [];
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

    const baseTitle =
      SUPPORTED_LOCALES.map((l) => title[l]).find((val) => val?.trim()) ||
      "article";
    const slug = slugify(baseTitle, { lower: true, strict: true });

    const article = await Articles.create({
      title,
      slug,
      summary,
      tenant: req.tenant,
      content,
      tags,
      category: isValidObjectId(category) ? category : undefined,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
      images,
      author: req.user?.name || "System",
      isActive: true,
    });

    logger.info(t("created"), { ...getRequestContext(req), id: article._id });
    res
      .status(201)
      .json({ success: true, message: t("created"), data: article });
  }
);

// ✅ UPDATE
export const updateArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.warn(t("invalidId"), { ...getRequestContext(req), id });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const article = await Articles.findOne({ _id: id, tenant: req.tenant });
    if (!article) {
      logger.warn(t("notFound"), { ...getRequestContext(req), id });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const updates = req.body;
    if (updates.title) {
      article.title = mergeLocalesForUpdate(
        article.title,
        parseIfJson(updates.title)
      );
    }
    if (updates.summary) {
      article.summary = mergeLocalesForUpdate(
        article.summary,
        parseIfJson(updates.summary)
      );
    }
    if (updates.content) {
      article.content = mergeLocalesForUpdate(
        article.content,
        parseIfJson(updates.content)
      );
    }

    const updatableFields: (keyof IArticles)[] = [
      "tags",
      "category",
      "isPublished",
      "publishedAt",
    ];
    for (const field of updatableFields) {
      if (updates[field] !== undefined)
        (article as any)[field] = updates[field];
    }

    if (!Array.isArray(article.images)) article.images = [];
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
        article.images.push({
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
        article.images = article.images.filter(
          (img: any) => !removed.includes(img.url)
        );
        for (const img of removed) {
          const localPath = path.join(
            "uploads",
            "articles-images",
            path.basename(img.url)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
        }
      } catch (e) {
        logger.warn(t("invalidRemovedImages"), {
          ...getRequestContext(req),
          error: e,
        });
      }
    }

    await article.save();
    logger.info(t("updated"), { ...getRequestContext(req), id });
    res
      .status(200)
      .json({ success: true, message: t("updated"), data: article });
  }
);

// ✅ GET ALL
export const adminGetAllArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
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

    const articlesList = await Articles.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const data = (articlesList as any[]).map((article) => ({
      ...article,
      title: extractMultilangValue(article.title, locale),
      summary: extractMultilangValue(article.summary, locale),
      content: extractMultilangValue(article.content, locale),
      category: article.category && {
        ...article.category,
        title: extractMultilangValue((article.category as any).title, locale),
      },
    }));

    logger.info(t("listFetched"), {
      ...getRequestContext(req),
      resultCount: data.length,
    });
    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

// ✅ GET BY ID
export const adminGetArticlesById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("invalidId"), { ...getRequestContext(req), id });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const article = await Articles.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!article || !article.isActive) {
      logger.warn(t("notFound"), { ...getRequestContext(req), id });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const populated = article as any;

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: {
        ...populated,
        title: extractMultilangValue(populated.title, locale),
        summary: extractMultilangValue(populated.summary, locale),
        content: extractMultilangValue(populated.content, locale),
        category: populated.category && {
          ...populated.category,
          title: extractMultilangValue(populated.category.title, locale),
        },
      },
    });
  }
);

// ✅ DELETE
export const deleteArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Articles } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    if (!isValidObjectId(id)) {
      logger.warn(t("invalidId"), { ...getRequestContext(req), id });
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const article = await Articles.findOne({ _id: id, tenant: req.tenant });
    if (!article) {
      logger.warn(t("notFound"), { ...getRequestContext(req), id });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    for (const img of article.images || []) {
      const localPath = path.join(
        "uploads",
        "articles-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          logger.error("Cloudinary delete error", {
            ...getRequestContext(req),
            publicId: img.publicId,
          });
        }
      }
    }

    await article.deleteOne();

    logger.info(t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
