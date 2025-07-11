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
export const createAboutCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { AboutCategory } = await getTenantModels(req);
      const category = await AboutCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.info(
        t("aboutcategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "aboutcategory.create",
          module: "aboutcategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("aboutcategory.create.success", { name: name[locale] }),
        data: category,
      });
    } catch (err: any) {
      logger.error(t("aboutcategory.create.error"), {
        ...getRequestContext(req),
        event: "aboutcategory.create",
        module: "aboutcategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("aboutcategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL
export const getAllAboutCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { AboutCategory } = await getTenantModels(req);
      const categories = await AboutCategory.find({ tenant: req.tenant })
        .sort({ createdAt: -1 })
        .lean();

      const localized = categories.map((cat) => ({
        ...cat,
        name: extractMultilangValue(cat.name, locale),
      }));

      logger.info(t("aboutcategory.list.success"), {
        ...getRequestContext(req),
        event: "aboutcategory.list",
        module: "aboutcategory",
        resultCount: localized.length,
      });

      res.status(200).json({
        success: true,
        message: t("aboutcategory.list.success"),
        data: localized,
      });
    } catch (err: any) {
      logger.error(t("aboutcategory.list.error"), {
        ...getRequestContext(req),
        event: "aboutcategory.list",
        module: "aboutcategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("aboutcategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID
export const getAboutCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("aboutcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("aboutcategory.invalidId") });
      return;
    }

    const { AboutCategory } = await getTenantModels(req);
    const category = await AboutCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.warn(t("aboutcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("aboutcategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("aboutcategory.fetch.success"),
      data: {
        ...category,
        name: extractMultilangValue(category.name, locale),
      },
    });
  }
);

// ✅ UPDATE
export const updateAboutCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.warn(t("aboutcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("aboutcategory.invalidId") });
      return;
    }

    const { AboutCategory } = await getTenantModels(req);
    const category = await AboutCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.warn(t("aboutcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("aboutcategory.notFound") });
      return;
    }

    if (name) {
      category.name = mergeLocalesForUpdate(category.name, name);
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    await category.save();

    logger.info(
      t("aboutcategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "aboutcategory.update",
        module: "aboutcategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("aboutcategory.update.success", {
        name: category.name[locale],
      }),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteAboutCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("aboutcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("aboutcategory.invalidId") });
      return;
    }

    const { AboutCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await AboutCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.warn(t("aboutcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("aboutcategory.notFound") });
      return;
    }

    const name = deleted.name
      ? extractMultilangValue(deleted.name, locale)
      : "Category";

    logger.info(t("aboutcategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "aboutcategory.delete",
      module: "aboutcategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("aboutcategory.delete.success", { name }),
    });
  }
);
