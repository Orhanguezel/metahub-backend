import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IReferences } from "@/modules/references/types";
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

// CREATE - Tekli & Toplu Logo Yükleme
export const createReferences = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { References } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      // Çoklu upload için files veya tekli için file
      const files: Express.Multer.File[] = (req.files as any) || (req.file ? [req.file] : []);

      // Kategori zorunlu!
      const { category, isPublished, publishedAt, title, content } = req.body;
      if (!category || !isValidObjectId(category)) {
        res.status(400).json({ success: false, message: t("categoryRequired") });
        return;
      }
      if (!files.length) {
        res.status(400).json({ success: false, message: t("imageRequired") });
        return;
      }

      // Diğer alanlar opsiyonel
      const baseTitle = fillAllLocales(parseIfJson(title));
      const baseContent = fillAllLocales(parseIfJson(content));

      const results: IReferences[] = [];
      for (const file of files) {
        // Image işleme
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

        // Slug'ı her logo için uniq üret (varsa dosya ismi eklensin)
        const nameForSlug = baseTitle?.[locale] || baseTitle?.en || path.parse(file.originalname).name || "logo";
        const slug = slugify(
          nameForSlug + "-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
          { lower: true, strict: true }
        );

        // Modeli oluştur
        const doc = await References.create({
          title: baseTitle,
          slug,
          tenant: req.tenant,
          content: baseContent,
          images: [
            {
              url: imageUrl,
              thumbnail,
              webp,
              publicId: (file as any).public_id,
            },
          ],
          category,
          isPublished: isPublished === undefined ? true : (isPublished === "true" || isPublished === true),
          publishedAt: isPublished ? publishedAt || new Date() : undefined,
          isActive: true,
        });

        results.push(doc);
        logger.withReq.info(req, t("created"), {
          ...getRequestContext(req),
          id: doc._id,
          filename: file.originalname,
        });
      }

      res.status(201).json({
        success: true,
        message: t("created"),
        data: results.length === 1 ? results[0] : results, // Tekli ise obje, çoklu ise array döner
      });return;
    } catch (err: any) {
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "references.create",
        module: "references",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({ success: false, message: t("error.create_fail") });
    }
  }
);

// UPDATE (resim ekleme, çıkarma, diğer alanlar opsiyonel)
export const updateReferences = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { References } = await getTenantModels(req);
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("invalidId") });
      return;
    }

    const references = await References.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!references) {
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    // Alanlar opsiyonel, gelen varsa güncelle
    if (req.body.title) references.title = fillAllLocales(parseIfJson(req.body.title));
    if (req.body.content) references.content = fillAllLocales(parseIfJson(req.body.content));
    if (req.body.category && isValidObjectId(req.body.category)) references.category = req.body.category;
    if (req.body.isPublished !== undefined) references.isPublished = req.body.isPublished === "true" || req.body.isPublished === true;
    if (req.body.publishedAt) references.publishedAt = req.body.publishedAt;
    if (req.body.isActive !== undefined) references.isActive = req.body.isActive === "true" || req.body.isActive === true;

    // Resim ekle
    if (Array.isArray(req.files) && req.files.length > 0) {
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
        references.images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // Resim silme (gelen "removedImages" -> url dizisi)
    if (req.body.removedImages) {
      try {
        const removed = JSON.parse(req.body.removedImages);
        references.images = references.images.filter(
          (img: any) => !removed.includes(img.url)
        );
        for (const imgUrl of removed) {
          const localPath = path.join("uploads", "references-images", path.basename(imgUrl));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          // cloudinary
          const imgObj = references.images.find((img: any) => img.url === imgUrl);
          if (imgObj && imgObj.publicId) {
            try { await cloudinary.uploader.destroy(imgObj.publicId); } catch {}
          }
        }
      } catch {}
    }

    await references.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: references });
  }
);




// ✅ GET ALL
export const adminGetAllReferences = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { References } = await getTenantModels(req);
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

    const referencesList = await References.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const data = referencesList;

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: data.length,
    });
    res.status(200).json({ success: true, message: t("listFetched"), data });
  }
);

// ✅ GET BY ID
export const adminGetReferencesById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { References } = await getTenantModels(req);
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

    const references = await References.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!references || Array.isArray(references) || !references.isActive) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const populated = references as any;

    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: populated,
    });
  }
);

// ✅ DELETE
export const deleteReferences = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { References } = await getTenantModels(req);
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

    const references = await References.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!references) {
      logger.withReq.warn(req, t("notFound"), {
        ...getRequestContext(req),
        id,
      });
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    for (const img of references.images || []) {
      const localPath = path.join(
        "uploads",
        "references-images",
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

    await references.deleteOne();

    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
