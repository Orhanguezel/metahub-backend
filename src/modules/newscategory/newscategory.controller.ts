import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { NewsCategory } from ".";
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
export const createNewsCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { NewsCategory } = await getTenantModels(req);
      const category = await NewsCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.info(
        t("newscategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "newscategory.create",
          module: "newscategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("newscategory.create.success", { name: name[locale] }),
        data: category,
      });
    } catch (err: any) {
      logger.error(t("newscategory.create.error"), {
        ...getRequestContext(req),
        event: "newscategory.create",
        module: "newscategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("newscategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL
export const getAllNewsCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { NewsCategory } = await getTenantModels(req);
      const categories = await NewsCategory.find({ tenant: req.tenant })
        .sort({ createdAt: -1 })
        .lean();

      const localized = categories.map((cat) => ({
        ...cat,
        name: extractMultilangValue(cat.name, locale),
      }));

      logger.info(t("newscategory.list.success"), {
        ...getRequestContext(req),
        event: "newscategory.list",
        module: "newscategory",
        resultCount: localized.length,
      });

      res.status(200).json({
        success: true,
        message: t("newscategory.list.success"),
        data: localized,
      });
    } catch (err: any) {
      logger.error(t("newscategory.list.error"), {
        ...getRequestContext(req),
        event: "newscategory.list",
        module: "newscategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("newscategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID
export const getNewsCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("newscategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("newscategory.invalidId") });
      return;
    }

    const { NewsCategory } = await getTenantModels(req);
    const category = await NewsCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.warn(t("newscategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("newscategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("newscategory.fetch.success"),
      data: {
        ...category,
        name: extractMultilangValue(category.name, locale),
      },
    });
  }
);

// ✅ UPDATE
export const updateNewsCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.warn(t("newscategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("newscategory.invalidId") });
      return;
    }

    const { NewsCategory } = await getTenantModels(req);
    const category = await NewsCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.warn(t("newscategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("newscategory.notFound") });
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
      t("newscategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "newscategory.update",
        module: "newscategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("newscategory.update.success", {
        name: category.name[locale],
      }),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteNewsCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("newscategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("newscategory.invalidId") });
      return;
    }

    const { NewsCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await NewsCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.warn(t("newscategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("newscategory.notFound") });
      return;
    }

    const name = deleted.name
      ? extractMultilangValue(deleted.name, locale)
      : "Category";

    logger.info(t("newscategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "newscategory.delete",
      module: "newscategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("newscategory.delete.success", { name }),
    });
  }
);
