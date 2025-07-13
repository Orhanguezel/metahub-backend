import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "../articles/i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

// ✅ CREATE (Tüm dilleri kaydeder)
export const createArticlesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { ArticlesCategory } = await getTenantModels(req);
      const category = await ArticlesCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.info(
        t("articlescategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "articlescategory.create",
          module: "articlescategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("articlescategory.create.success", { name: name[locale] }),
        data: category, // .name burada tüm diller ile döner!
      });
    } catch (err: any) {
      logger.error(t("articlescategory.create.error"), {
        ...getRequestContext(req),
        event: "articlescategory.create",
        module: "articlescategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("articlescategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL (Tüm dillerle gönderir)
export const getAllArticlesCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { ArticlesCategory } = await getTenantModels(req);

      const filter: Record<string, any> = {
        tenant: req.tenant,
      };
      if (req.query.isActive) {
        filter.isActive = req.query.isActive === "true";
      }

      const categories = await ArticlesCategory.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      logger.info(t("articlescategory.list.success"), {
        ...getRequestContext(req),
        event: "articlescategory.list",
        module: "articlescategory",
        resultCount: categories.length,
      });

      res.status(200).json({
        success: true,
        message: t("articlescategory.list.success"),
        data: categories, // <--- .name: {tr, en, ...} tüm dillerle gelir!
      });
    } catch (err: any) {
      logger.error(t("articlescategory.list.error"), {
        ...getRequestContext(req),
        event: "articlescategory.list",
        module: "articlescategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("articlescategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID (Tüm dillerle)
export const getArticlesCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("articlescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("articlescategory.invalidId") });
      return;
    }

    const { ArticlesCategory } = await getTenantModels(req);
    const category = await ArticlesCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.warn(t("articlescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("articlescategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("articlescategory.fetch.success"),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ UPDATE (Tüm dilleri merge ederek günceller)
export const updateArticlesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.warn(t("articlescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("articlescategory.invalidId") });
      return;
    }

    const { ArticlesCategory } = await getTenantModels(req);
    const category = await ArticlesCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.warn(t("articlescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("articlescategory.notFound") });
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
      t("articlescategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "articlescategory.update",
        module: "articlescategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("articlescategory.update.success", {
        name: category.name[locale],
      }),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ DELETE
export const deleteArticlesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("articlescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("articlescategory.invalidId") });
      return;
    }

    const { ArticlesCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await ArticlesCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.warn(t("articlescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("articlescategory.notFound") });
      return;
    }

    const name = deleted.name?.[locale] || "Category";

    logger.info(t("articlescategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "articlescategory.delete",
      module: "articlescategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("articlescategory.delete.success", { name }),
    });
  }
);
