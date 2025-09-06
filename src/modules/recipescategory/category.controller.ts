import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";

// Helpers
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const normOrder = (v: any) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  if (r < 0) return 0;
  if (r > 100000) return 100000;
  return r;
};

// ========== CREATE ==========
export const createRecipeCategory = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const name = fillAllLocales(req.body?.name);
    const isActive = req.body?.isActive == null ? true : (req.body.isActive === "true" || req.body.isActive === true);
    const order = normOrder(req.body?.order);

    const { RecipeCategory } = await getTenantModels(req);
    const doc = await RecipeCategory.create({
      tenant: req.tenant,
      name,
      isActive,
      order,
      slug: req.body?.slug, // pre('validate') slugify edecek
    });

    logger.withReq.info(req, t("recipecategory.create.success"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("recipecategory.create.success"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("recipecategory.create.error"), { ...getRequestContext(req), error: err?.message });
    res.status(500).json({ success: false, message: t("recipecategory.create.error") });
  }
});

// ========== LIST (PUBLIC) ==========
export const getAllRecipeCategories = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { RecipeCategory } = await getTenantModels(req);
    const filter: Record<string, any> = { tenant: req.tenant };
    if (req.query.isActive != null) filter.isActive = String(req.query.isActive) === "true";
    if (req.query.q) {
      const q = String(req.query.q).trim();
      filter.$or = [
        { slug: { $regex: q, $options: "i" } },
        // tüm dillerde name araması
        // SUPPORTED_LOCALES import etmeye gerek yok: geniş alan araması
        { "name.tr": { $regex: q, $options: "i" } },
        { "name.en": { $regex: q, $options: "i" } },
        { "name.de": { $regex: q, $options: "i" } },
        { "name.pl": { $regex: q, $options: "i" } },
        { "name.fr": { $regex: q, $options: "i" } },
        { "name.es": { $regex: q, $options: "i" } },
      ];
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const list = await (RecipeCategory as any)
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    logger.withReq.info(req, t("recipecategory.list.success"), { ...getRequestContext(req), resultCount: list.length });
    res.status(200).json({ success: true, message: t("recipecategory.list.success"), data: list });
  } catch (err: any) {
    logger.withReq.error(req, t("recipecategory.list.error"), { ...getRequestContext(req), error: err?.message });
    res.status(500).json({ success: false, message: t("recipecategory.list.error") });
  }
});

// ========== GET BY ID (PUBLIC) ==========
export const getRecipeCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { id } = req.params;
    const { RecipeCategory } = await getTenantModels(req);
    const doc = await RecipeCategory.findOne({ _id: id, tenant: req.tenant }).lean();
    if (!doc) {
      res.status(404).json({ success: false, message: t("recipecategory.notFound") });
      return;
    }
    res.status(200).json({ success: true, message: t("recipecategory.fetch.success"), data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, message: t("recipecategory.list.error") });
  }
});

// ========== UPDATE ==========
export const updateRecipeCategory = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { id } = req.params;
    const { RecipeCategory } = await getTenantModels(req);
    const doc = await RecipeCategory.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("recipecategory.notFound") });
      return;
    }

    if (req.body?.name) doc.name = mergeLocalesForUpdate(doc.name as any, req.body.name);
    if (req.body?.slug) doc.slug = String(req.body.slug);
    if (req.body?.isActive != null) doc.isActive = (req.body.isActive === "true" || req.body.isActive === true);
    if (req.body?.order != null) {
      const o = normOrder(req.body.order);
      if (o != null) doc.order = o;
    }

    await doc.save();
    logger.withReq.info(req, t("recipecategory.update.success"), { ...getRequestContext(req), id: doc._id });
    res.status(200).json({ success: true, message: t("recipecategory.update.success"), data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, message: t("recipecategory.list.error") });
  }
});

// ========== DELETE ==========
export const deleteRecipeCategory = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { id } = req.params;
    const { RecipeCategory } = await getTenantModels(req);
    const deleted = await RecipeCategory.findOneAndDelete({ _id: id, tenant: req.tenant });
    if (!deleted) {
      res.status(404).json({ success: false, message: t("recipecategory.notFound") });
      return;
    }
    logger.withReq.info(req, t("recipecategory.delete.success"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("recipecategory.delete.success") });
  } catch (err: any) {
    res.status(500).json({ success: false, message: t("recipecategory.list.error") });
  }
});
