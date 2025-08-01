import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "../massage/i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

// ✅ CREATE (Tüm dilleri kaydeder)
export const createMassageCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { MassageCategory } = await getTenantModels(req);
      const category = await MassageCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.withReq.info(
        req,
        t("massagecategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "massagecategory.create",
          module: "massagecategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("massagecategory.create.success", { name: name[locale] }),
        data: category, // .name burada tüm diller ile döner!
      });
    } catch (err: any) {
      logger.withReq.error(req, t("massagecategory.create.error"), {
        ...getRequestContext(req),
        event: "massagecategory.create",
        module: "massagecategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("massagecategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL (Tüm dillerle gönderir)
export const getAllMassageCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { MassageCategory } = await getTenantModels(req);

      const filter: Record<string, any> = {
        tenant: req.tenant,
      };
      if (req.query.isActive) {
        filter.isActive = req.query.isActive === "true";
      }

      const categories = await MassageCategory.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      logger.withReq.info(req, t("massagecategory.list.success"), {
        ...getRequestContext(req),
        event: "massagecategory.list",
        module: "massagecategory",
        resultCount: categories.length,
      });

      res.status(200).json({
        success: true,
        message: t("massagecategory.list.success"),
        data: categories, // <--- .name: {tr, en, ...} tüm dillerle gelir!
      });
    } catch (err: any) {
      logger.withReq.error(req, t("massagecategory.list.error"), {
        ...getRequestContext(req),
        event: "massagecategory.list",
        module: "massagecategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("massagecategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID (Tüm dillerle)
export const getMassageCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("massagecategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("massagecategory.invalidId") });
      return;
    }

    const { MassageCategory } = await getTenantModels(req);
    const category = await MassageCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.withReq.warn(
        req,
        t("massagecategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("massagecategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("massagecategory.fetch.success"),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ UPDATE (Tüm dilleri merge ederek günceller)
export const updateMassageCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("massagecategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("massagecategory.invalidId") });
      return;
    }

    const { MassageCategory } = await getTenantModels(req);
    const category = await MassageCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.withReq.warn(
        req,
        t("massagecategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("massagecategory.notFound") });
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
      t("massagecategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "massagecategory.update",
        module: "massagecategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("massagecategory.update.success", {
        name: category.name[locale],
      }),
      data: category, // .name tüm dillerle!
    });
  }
);

// ✅ DELETE
export const deleteMassageCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.warn(
        req,
        t("massagecategory.invalidId"),
        getRequestContext(req)
      );
      res
        .status(400)
        .json({ success: false, message: t("massagecategory.invalidId") });
      return;
    }

    const { MassageCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await MassageCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.withReq.warn(
        req,
        t("massagecategory.notFound"),
        getRequestContext(req)
      );
      res
        .status(404)
        .json({ success: false, message: t("massagecategory.notFound") });
      return;
    }

    const name = deleted.name?.[locale] || "Category";

    logger.withReq.info(req, t("massagecategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "massagecategory.delete",
      module: "massagecategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("massagecategory.delete.success", { name }),
    });
  }
);
