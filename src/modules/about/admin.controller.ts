import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IAbout } from "@/modules/about/types";
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
export const createAbout = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { About } = await getTenantModels(req);
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  try {
    let { title, summary, content, tags, category, isPublished, publishedAt } =
      req.body;

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

    const images: IAbout["images"] = [];
    if (Array.isArray(req.files)) {
      console.log("[UPLOAD][about] req.uploadType:", req.uploadType);   // <-- EN ÖNEMLİSİ!
  console.log("[UPLOAD][about] req.files:", req.files);
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

    const nameForSlug = title?.[locale] || title?.en || "about";
    const slug = slugify(nameForSlug, { lower: true, strict: true });

    const about = await About.create({
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

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: about._id,
    });
    res.status(201).json({ success: true, message: t("created"), data: about });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "about.create",
      module: "about",
      status: "fail",
      error: err.message,
    });

    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// ✅ UPDATE
export const updateAbout = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { About } = await getTenantModels(req);
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const about = await About.findOne({ _id: id, tenant: req.tenant });
  if (!about) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const updates = req.body;
  if (updates.title) {
    about.title = mergeLocalesForUpdate(
      about.title,
      parseIfJson(updates.title)
    );
  }
  if (updates.summary) {
    about.summary = mergeLocalesForUpdate(
      about.summary,
      parseIfJson(updates.summary)
    );
  }
  if (updates.content) {
    about.content = mergeLocalesForUpdate(
      about.content,
      parseIfJson(updates.content)
    );
  }

  const updatableFields: (keyof IAbout)[] = [
    "tags",
    "category",
    "isPublished",
    "publishedAt",
  ];
  for (const field of updatableFields) {
    if (updates[field] !== undefined) (about as any)[field] = updates[field];
  }

  if (!Array.isArray(about.images)) about.images = [];
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
      about.images.push({
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
      about.images = about.images.filter(
        (img: any) => !removed.includes(img.url)
      );
      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          "about-images",
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

  await about.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: about });
});

// ✅ GET ALL
export const adminGetAllAbout = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { About } = await getTenantModels(req);
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

    const aboutList = await About.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const data = aboutList;

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: data.length,
    });
    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

// ✅ GET BY ID
export const adminGetAboutById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { About } = await getTenantModels(req);
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

    const about = await About.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!about || Array.isArray(about) || !about.isActive) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const populated = about as any;

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: populated,
    });
  }
);

// ✅ DELETE
export const deleteAbout = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { About } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const about = await About.findOne({ _id: id, tenant: req.tenant });
  if (!about) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  for (const img of about.images || []) {
    const localPath = path.join(
      "uploads",
      "about-images",
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

  await about.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
