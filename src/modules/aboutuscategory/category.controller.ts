import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "../aboutus/i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

// ✅ CREATE (Tüm dilleri kaydeder)
export const createAboutusCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { AboutusCategory } = await getTenantModels(req);
      const category = await AboutusCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.withReq.info(
        req,
        t("aboutuscategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "aboutuscategory.create",
          module: "aboutuscategory",
          status: "success",
        }
      );


      res.status(201).json({
        success: true,
        message: t("aboutuscategory.create.success", { name: name[locale] }),
        data: category, // .name burada tüm diller ile döner!
      });
    } catch (err: any) {
      logger.withReq.error(req, t("aboutuscategory.create.error"), {
        ...getRequestContext(req),
        event: "aboutuscategory.create",
        module: "aboutuscategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("aboutuscategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL (Tüm dillerle gönderir)
export const getAllAboutusCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { AboutusCategory } = await getTenantModels(req);

      const filter: Record<string, any> = {
        tenant: req.tenant,
      };
      if (req.query.isActive) {
        filter.isActive = req.query.isActive === "true";
      }

      const categories = await AboutusCategory.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      logger.withReq.info(req, t("aboutuscategory.list.success"), {
        ...getRequestContext(req),
        event: "aboutuscategory.list",
        module: "aboutuscategory",
        resultCount: categories.length,
      });

      res.status(200).json({
        success: true,
        message: t("aboutuscategory.list.success"),
        data: categories, // <--- .name: {tr, en, ...} tüm dillerle gelir!
      });
    } catch (err: any) {
      logger.withReq.error(req, t("aboutuscategory.list.error"), {
        ...getRequestContext(req),
        event: "aboutuscategory.list",
        module: "aboutuscategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("aboutuscategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID (Tüm dillerle)
export const getAboutusCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("aboutuscategory.invalidId") });
      return;
    }

    const { AboutusCategory } = await getTenantModels(req);
    const category = await AboutusCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("aboutuscategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("aboutuscategory.fetch.success"),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ UPDATE (Tüm dilleri merge ederek günceller)
export const updateAboutusCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("aboutuscategory.invalidId") });
      return;
    }

    const { AboutusCategory } = await getTenantModels(req);
    const category = await AboutusCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("aboutuscategory.notFound") });
      return;
    }

    if (name) {
      category.name = mergeLocalesForUpdate(category.name, name);
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    await category.save();

    logger.withReq.info(req,
      t("aboutuscategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "aboutuscategory.update",
        module: "aboutuscategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("aboutuscategory.update.success", {
        name: category.name[locale],
      }),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ DELETE
export const deleteAboutusCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("aboutuscategory.invalidId") });
      return;
    }

    const { AboutusCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await AboutusCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.withReq.warn(
        req,
        t("aboutuscategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("aboutuscategory.notFound") });
      return;
    }

    const name = deleted.name?.[locale] || "Category";

    logger.withReq.info(req, t("aboutuscategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "aboutuscategory.delete",
      module: "aboutuscategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("aboutuscategory.delete.success", { name }),
    });
  }
);
