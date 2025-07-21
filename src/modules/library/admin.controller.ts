import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ILibrary } from "@/modules/library/types";
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

// -- Helpers --
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE
// ... importlar ve yardımcılar yukarıdaki gibi ...

// ✅ CREATE
export const createLibrary = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Library } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

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

    if (typeof tags === "string") {
      try { tags = JSON.parse(tags); } catch { tags = [tags]; }
    }
    if (!Array.isArray(tags)) tags = [];

    const images: ILibrary["images"] = [];
    const files: ILibrary["files"] = [];

    // --- Hem fields hem array için kesin kontrol ---
    // Eğer multer.fields() ise:
    if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
      // images
      if (Array.isArray((req.files as any)["images"])) {
        for (const file of (req.files as any)["images"]) {
          if (file.mimetype && file.mimetype.startsWith("image/")) {
            const imageUrl = getImagePath(file);
            let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
            if (shouldProcessImage()) {
              const processed = await processImageLocal(
                file.path, file.filename, path.dirname(file.path)
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
          } else {
            console.warn("[UPLOAD] 'images' alanında image olmayan dosya yollandı:", file.originalname, file.mimetype);
          }
        }
      }
      // files
      if (Array.isArray((req.files as any)["files"])) {
        for (const file of (req.files as any)["files"]) {
          files.push({
            url: getImagePath(file),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            publicId: (file as any).public_id,
          });
        }
      }
    }

    // Eğer multer.array() ise:
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
              file.path, file.filename, path.dirname(file.path)
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
        if (file.fieldname === "files") {
          files.push({
            url: getImagePath(file),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            publicId: (file as any).public_id,
          });
        }
      }
    }

    const nameForSlug = title?.[locale] || title?.en || "library";
    const slug = slugify(nameForSlug, { lower: true, strict: true });

    const library = await Library.create({
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
      files,
      author: req.user?.name || "System",
      isActive: true,
      views: 0,
      downloadCount: 0,
    });

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: library._id,
    });
    res.status(201).json({ success: true, message: t("created"), data: library });

  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "library.create",
      module: "library",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});


// ✅ UPDATE
export const updateLibrary = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Library } = await getTenantModels(req);
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

  const library = await Library.findOne({ _id: id, tenant: req.tenant });
  if (!library) {
    logger.withReq.warn(req, t("notFound"), {
      ...getRequestContext(req),
      id,
    });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const updates = req.body;
  if (updates.title) {
    library.title = mergeLocalesForUpdate(
      library.title,
      parseIfJson(updates.title)
    );
  }
  if (updates.summary) {
    library.summary = mergeLocalesForUpdate(
      library.summary,
      parseIfJson(updates.summary)
    );
  }
  if (updates.content) {
    library.content = mergeLocalesForUpdate(
      library.content,
      parseIfJson(updates.content)
    );
  }

  const updatableFields: (keyof ILibrary)[] = [
    "tags",
    "category",
    "isPublished",
    "publishedAt",
    "isActive",
  ];
  for (const field of updatableFields) {
    if (updates[field] !== undefined) (library as any)[field] = updates[field];
  }

  // IMAGE UPDATE
  if (!Array.isArray(library.images)) library.images = [];
  // FILES UPDATE
  if (!Array.isArray(library.files)) library.files = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      // -- SADECE IMAGE FIELD + IMAGE MIMETYPE --
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
        library.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }

      // -- SADECE FILE FIELD --
      if (file.fieldname === "files") {
        library.files.push({
          url: getImagePath(file),
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          publicId: (file as any).public_id,
        });
      }
    }
  }

  // Image Remove
  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      library.images = library.images.filter(
        (img: any) => !removed.includes(img.url)
      );
      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          "library-images",
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
  // File Remove
  if (updates.removedFiles) {
    try {
      const removed = JSON.parse(updates.removedFiles);
      library.files = library.files.filter(
        (file: any) => !removed.includes(file.url)
      );
      for (const file of removed) {
        const localPath = path.join(
          "uploads",
          "library-files",
          path.basename(file.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (file.publicId) await cloudinary.uploader.destroy(file.publicId);
      }
    } catch (e) {
      logger.withReq.warn(req, t("invalidRemovedFiles"), {
        ...getRequestContext(req),
        error: e,
      });
    }
  }

  await library.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res
    .status(200)
    .json({ success: true, message: t("updated"), data: library });
});

// ✅ GET ALL
export const adminGetAllLibrary = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Library } = await getTenantModels(req);
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

    const libraryList = await Library.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: libraryList.length,
    });
    res
      .status(200)
      .json({ success: true, message: t("listFetched"), data: libraryList });
  }
);

// ✅ GET BY ID + VIEWS INCREMENT
export const adminGetLibraryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Library } = await getTenantModels(req);
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

    // views otomatik artır
    const library = await Library.findOneAndUpdate(
      { _id: id, tenant: req.tenant, isActive: true },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .lean();

    if (!library || Array.isArray(library) || !library.isActive) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: library,
    });
  }
);

// ✅ DOWNLOAD COUNT INCREMENT (public endpoint)
export const incrementLibraryDownloadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Library } = await getTenantModels(req);
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

    const library = await Library.findOneAndUpdate(
      { _id: id, tenant: req.tenant, isActive: true },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!library) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }
    res
      .status(200)
      .json({ success: true, message: t("downloadCountIncreased"), data: { downloadCount: library.downloadCount } });
  }
);

// ✅ DELETE
export const deleteLibrary = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Library } = await getTenantModels(req);
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

    const library = await Library.findOne({ _id: id, tenant: req.tenant });
    if (!library) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    // Tüm image ve file fiziksel silme
    for (const img of library.images || []) {
      const localPath = path.join(
        "uploads",
        "library-images",
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
    for (const file of library.files || []) {
      const localPath = path.join(
        "uploads",
        "library-files",
        path.basename(file.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (file.publicId) {
        try {
          await cloudinary.uploader.destroy(file.publicId);
        } catch (err) {
          logger.withReq.error(req, t("Cloudinary delete error"), {
            ...getRequestContext(req),
            publicId: file.publicId,
          });
        }
      }
    }

    await library.deleteOne();

    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
