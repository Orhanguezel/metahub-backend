import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { BlogCategory } from ".";
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
export const createBlogCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const name = fillAllLocales(req.body.name);

    try {
      const { BlogCategory } = await getTenantModels(req);
      const category = await BlogCategory.create({
        name,
        tenant: req.tenant,
      });

      logger.info(
        t("blogcategory.create.success", { name: name[locale] }),
        {
          ...getRequestContext(req),
          event: "blogcategory.create",
          module: "blogcategory",
          status: "success",
        }
      );

      res.status(201).json({
        success: true,
        message: t("blogcategory.create.success", { name: name[locale] }),
        data: category,
      });
    } catch (err: any) {
      logger.error(t("blogcategory.create.error"), {
        ...getRequestContext(req),
        event: "blogcategory.create",
        module: "blogcategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("blogcategory.create.error"),
      });
    }
  }
);

// ✅ GET ALL
export const getAllBlogCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { BlogCategory } = await getTenantModels(req);
      const categories = await BlogCategory.find({ tenant: req.tenant })
        .sort({ createdAt: -1 })
        .lean();

      const localized = categories.map((cat) => ({
        ...cat,
        name: extractMultilangValue(cat.name, locale),
      }));

      logger.info(t("blogcategory.list.success"), {
        ...getRequestContext(req),
        event: "blogcategory.list",
        module: "blogcategory",
        resultCount: localized.length,
      });

      res.status(200).json({
        success: true,
        message: t("blogcategory.list.success"),
        data: localized,
      });
    } catch (err: any) {
      logger.error(t("blogcategory.list.error"), {
        ...getRequestContext(req),
        event: "blogcategory.list",
        module: "blogcategory",
        status: "fail",
        error: err.message,
      });

      res.status(500).json({
        success: false,
        message: t("blogcategory.list.error"),
      });
    }
  }
);

// ✅ GET BY ID
export const getBlogCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("blogcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("blogcategory.invalidId") });
      return;
    }

    const { BlogCategory } = await getTenantModels(req);
    const category = await BlogCategory.findOne({
      _id: id,
      tenant: req.tenant,
    }).lean();

    if (!category) {
      logger.warn(t("blogcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("blogcategory.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      message: t("blogcategory.fetch.success"),
      data: {
        ...category,
        name: extractMultilangValue(category.name, locale),
      },
    });
  }
);

// ✅ UPDATE
export const updateBlogCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      logger.warn(t("blogcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("blogcategory.invalidId") });
      return;
    }

    const { BlogCategory } = await getTenantModels(req);
    const category = await BlogCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      logger.warn(t("blogcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("blogcategory.notFound") });
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
      t("blogcategory.update.success", { name: category.name[locale] }),
      {
        ...getRequestContext(req),
        event: "blogcategory.update",
        module: "blogcategory",
        status: "success",
      }
    );

    res.status(200).json({
      success: true,
      message: t("blogcategory.update.success", {
        name: category.name[locale],
      }),
      data: category,
    });
  }
);

// ✅ DELETE
export const deleteBlogCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: Record<string, any>) =>
      translate(key, locale, translations, params);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.warn(t("blogcategory.invalidId"), getRequestContext(req));
      res
        .status(400)
        .json({ success: false, message: t("blogcategory.invalidId") });
      return;
    }

    const { BlogCategory } = await getTenantModels(req);

    // ✔️ findOneAndDelete ile hem kontrol hem veri döner
    const deleted = await BlogCategory.findOneAndDelete({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      logger.warn(t("blogcategory.notFound"), getRequestContext(req));
      res
        .status(404)
        .json({ success: false, message: t("blogcategory.notFound") });
      return;
    }

    const name = deleted.name
      ? extractMultilangValue(deleted.name, locale)
      : "Category";

    logger.info(t("blogcategory.delete.success", { name }), {
      ...getRequestContext(req),
      event: "blogcategory.delete",
      module: "blogcategory",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: t("blogcategory.delete.success", { name }),
    });
  }
);
