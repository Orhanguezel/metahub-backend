import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { extractMultilangValue } from "@/core/utils/i18n/parseMultilangField";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ CREATE
export const createGalleryCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);
    const description = fillAllLocales(req.body.description);

    try {
      const { GalleryCategory } = await getTenantModels(req);
      const category = await GalleryCategory.create({
        name,
        description,
        tenant: req.tenant,
      });

      logger.withReq.info(
        req,
        t("gallerycategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "gallerycategory.create",
          module: "gallerycategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("gallerycategory.create.success", { name: name[locale] }),
        data: category,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("gallerycategory.create.error"), {
        ...getRequestContext(req),
        event: "gallerycategory.create",
        module: "gallerycategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("gallerycategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL
export const getAllGalleryCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { GalleryCategory } = await getTenantModels(req);
      const categories = await GalleryCategory.find({ tenant: req.tenant })
        .sort({ createdAt: -1 })
        .lean();

      const localized = categories.map((cat: any) => ({
        ...cat,
        name: extractMultilangValue(cat.name, locale),
        description: extractMultilangValue(cat.description, locale),
      }));

      logger.withReq.info(req, t("gallerycategory.list.success"), {
        ...getRequestContext(req),
        event: "gallerycategory.list",
        module: "gallerycategory",
        resultCount: localized.length,
      });

      res.status(200).json({
        success: true,
        message: t("gallerycategory.list.success"),
        data: localized,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("gallerycategory.list.error"), {
        ...getRequestContext(req),
        event: "gallerycategory.list",
        module: "gallerycategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("gallerycategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID
export const getGalleryCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("gallerycategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("gallerycategory.invalidId") });
      return;
    }

    const { GalleryCategory } = await getTenantModels(req);
    const category = await GalleryCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.withReq.warn(
        req,
        t("gallerycategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("gallerycategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("gallerycategory.fetch.success"),
      data: {
        ...category,
        name: extractMultilangValue(category.name, locale),
      },
    });
  }
);

// ✅ UPDATE
export const updateGalleryCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("gallerycategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("gallerycategory.invalidId") });
      return;
    }

    const { GalleryCategory } = await getTenantModels(req);
    const category = await GalleryCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.withReq.warn(
        req,
        t("gallerycategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("gallerycategory.notFound") });
      return;
    }

    if (name) {
      category.name = mergeLocalesForUpdate(category.name, name);
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    await category.save();

    logger.withReq.info(
      req,
      t("gallerycategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "gallerycategory.update",
        module: "gallerycategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("gallerycategory.update.success", {
        name: category.name[locale],
        description: category.description[locale],
      }),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteGalleryCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("gallerycategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("gallerycategory.invalidId") });
      return;
    }

    const { GalleryCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await GalleryCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.withReq.warn(
        req,
        t("gallerycategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("gallerycategory.notFound") });
      return;
    }

    const name = deleted.name
      ? extractMultilangValue(deleted.name, locale)
      : "Category";

    logger.withReq.info(req, t("gallerycategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "gallerycategory.delete",
      module: "gallerycategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("gallerycategory.delete.success", { name }),
    });
  }
);
