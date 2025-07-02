import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { ReferencesCategory } from ".";
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
export const createReferencesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { ReferencesCategory } = await getTenantModels(req);
      const category = await ReferencesCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.info(
        t("referencescategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "referencescategory.create",
          module: "referencescategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("referencescategory.create.success", { name: name[locale] }),
        data: category,
      });
    } catch (err: any) {
      logger.error(t("referencescategory.create.error"), {
        ...getRequestContext(req),
        event: "referencescategory.create",
        module: "referencescategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("referencescategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL
export const getAllReferencesCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { ReferencesCategory } = await getTenantModels(req);
      const categories = await ReferencesCategory.find({ tenant: req.tenant })
        .sort({ createdAt: -1 })
        .lean();

      const localized = categories.map((cat) => ({
        ...cat,
        name: extractMultilangValue(cat.name, locale),
      }));

      logger.info(t("referencescategory.list.success"), {
        ...getRequestContext(req),
        event: "referencescategory.list",
        module: "referencescategory",
        resultCount: localized.length,
      });

      res.status(200).json({
        success: true,
        message: t("referencescategory.list.success"),
        data: localized,
      });
    } catch (err: any) {
      logger.error(t("referencescategory.list.error"), {
        ...getRequestContext(req),
        event: "referencescategory.list",
        module: "referencescategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("referencescategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID
export const getReferencesCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("referencescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("referencescategory.invalidId") });
      return;
    }

    const { ReferencesCategory } = await getTenantModels(req);
    const category = await ReferencesCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.warn(t("referencescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("referencescategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("referencescategory.fetch.success"),
      data: {
        ...category,
        name: extractMultilangValue(category.name, locale),
      },
    });
  }
);

// ✅ UPDATE
export const updateReferencesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.warn(t("referencescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("referencescategory.invalidId") });
      return;
    }

    const { ReferencesCategory } = await getTenantModels(req);
    const category = await ReferencesCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.warn(t("referencescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("referencescategory.notFound") });
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
      t("referencescategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "referencescategory.update",
        module: "referencescategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("referencescategory.update.success", {
        name: category.name[locale],
      }),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteReferencesCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("referencescategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("referencescategory.invalidId") });
      return;
    }

    const { ReferencesCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await ReferencesCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.warn(t("referencescategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("referencescategory.notFound") });
      return;
    }

    const name = deleted.name
      ? extractMultilangValue(deleted.name, locale)
      : "Category";

    logger.info(t("referencescategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "referencescategory.delete",
      module: "referencescategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("referencescategory.delete.success", { name }),
    });
  }
);
