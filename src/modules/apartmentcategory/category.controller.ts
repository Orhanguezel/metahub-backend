import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "../apartment/i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

// ✅ CREATE
export const createApartmentCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { ApartmentCategory } = await getTenantModels(req);

    const name = fillAllLocales(req.body.name);
    const bodySlug = typeof req.body.slug === "string" ? req.body.slug : "";
    const slug = bodySlug ? slugify(bodySlug, { lower: true, strict: true }) : undefined;

    const payload = {
      name,
      tenant: req.tenant,
      slug, // model pre-validate yoksa name’den üretir
      city: req.body.city || undefined,
      district: req.body.district || undefined,
      zip: req.body.zip || undefined,
      isActive:
        typeof req.body.isActive === "boolean"
          ? req.body.isActive
          : req.body.isActive === "true"
          ? true
          : req.body.isActive === "false"
          ? false
          : true,
    };

    const category = await ApartmentCategory.create(payload);

    logger.withReq.info(
      req,
      t("apartmentcategory.create.success", { name: name[locale] }),
      { ...getRequestContext(req), event: "apartmentcategory.create", module: "apartmentcategory" }
    );

    res.status(201).json({
      success: true,
      message: t("apartmentcategory.create.success", { name: name[locale] }),
      data: category,
    });
  } catch (err: any) {
    // Duplicate (tenant+slug)
    if (err?.code === 11000) {
      res.status(409).json({
        success: false,
        message: translate("apartmentcategory.duplicate", locale, translations),
      });
      return;
    }
    logger.withReq.error(req, translate("apartmentcategory.create.error", locale, translations), {
      ...getRequestContext(req),
      event: "apartmentcategory.create",
      module: "apartmentcategory",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({
      success: false,
      message: translate("apartmentcategory.create.error", locale, translations),
    });
  }
});

// ✅ GET ALL (filtreler: isActive, city, district, zip)
export const getAllApartmentCategories = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);

  try {
    const { ApartmentCategory } = await getTenantModels(req);

    const filter: Record<string, any> = { tenant: req.tenant };
    if (typeof req.query.isActive === "string") filter.isActive = req.query.isActive === "true";
    if (typeof req.query.city === "string") filter.city = req.query.city;
    if (typeof req.query.district === "string") filter.district = req.query.district;
    if (typeof req.query.zip === "string") filter.zip = req.query.zip;

    const categories = await ApartmentCategory.find(filter).sort({ createdAt: -1 }).lean();

    logger.withReq.info(req, t("apartmentcategory.list.success"), {
      ...getRequestContext(req),
      event: "apartmentcategory.list",
      module: "apartmentcategory",
      resultCount: categories.length,
    });

    res.status(200).json({
      success: true,
      message: t("apartmentcategory.list.success"),
      data: categories,
    });
  } catch (err: any) {
    logger.withReq.error(req, t("apartmentcategory.list.error"), {
      ...getRequestContext(req),
      event: "apartmentcategory.list",
      module: "apartmentcategory",
      status: "fail",
      error: err.message,
    });

    res.status(500).json({
      success: false,
      message: t("apartmentcategory.list.error"),
    });
  }
});

// ✅ GET BY ID
export const getApartmentCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("apartmentcategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("apartmentcategory.invalidId") });
    return;
  }

  const { ApartmentCategory } = await getTenantModels(req);
  const category = await ApartmentCategory.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!category) {
    logger.withReq.warn(req, t("apartmentcategory.notFound"), getRequestContext(req));
    res.status(404).json({ success: false, message: t("apartmentcategory.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("apartmentcategory.fetch.success"),
    data: category,
  });
});

// ✅ UPDATE (merge i18n + opsiyonel alanlar)
export const updateApartmentCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("apartmentcategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("apartmentcategory.invalidId") });
    return;
  }

  try {
    const { ApartmentCategory } = await getTenantModels(req);
    const category = await ApartmentCategory.findOne({ _id: id, tenant: req.tenant });
    if (!category) {
      logger.withReq.warn(req, t("apartmentcategory.notFound"), getRequestContext(req));
      res.status(404).json({ success: false, message: t("apartmentcategory.notFound") });
      return;
    }

    if (req.body.name) {
      const incoming = typeof req.body.name === "string" ? JSON.parse(req.body.name) : req.body.name;
      category.name = mergeLocalesForUpdate(category.name, incoming);
    }

    if (typeof req.body.slug === "string" && req.body.slug.trim()) {
      category.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    if (typeof req.body.isActive === "boolean") {
      category.isActive = req.body.isActive;
    } else if (typeof req.body.isActive === "string") {
      category.isActive = req.body.isActive === "true";
    }

    if (typeof req.body.city === "string") category.city = req.body.city;
    if (typeof req.body.district === "string") category.district = req.body.district;
    if (typeof req.body.zip === "string") category.zip = req.body.zip;

    await category.save();

    logger.withReq.info(
      req,
      t("apartmentcategory.update.success", { name: category.name[locale] }),
      { ...getRequestContext(req), event: "apartmentcategory.update", module: "apartmentcategory" }
    );

    res.status(200).json({
      success: true,
      message: t("apartmentcategory.update.success", { name: category.name[locale] }),
      data: category,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({
        success: false,
        message: translate("apartmentcategory.duplicate", locale, translations),
      });
      return;
    }
    logger.withReq.error(req, t("apartmentcategory.update.error"), {
      ...getRequestContext(req),
      event: "apartmentcategory.update",
      module: "apartmentcategory",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("apartmentcategory.update.error") });
  }
});

// ✅ DELETE
export const deleteApartmentCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: Record<string, any>) =>
    translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("apartmentcategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("apartmentcategory.invalidId") });
    return;
  }

  const { ApartmentCategory } = await getTenantModels(req);
  const deleted = await ApartmentCategory.findOneAndDelete({ _id: id, tenant: req.tenant });

  if (!deleted) {
    logger.withReq.warn(req, t("apartmentcategory.notFound"), getRequestContext(req));
    res.status(404).json({ success: false, message: t("apartmentcategory.notFound") });
    return;
  }

  const name = (deleted as any).name?.[locale] || "Category";
  logger.withReq.info(req, t("apartmentcategory.delete.success", { name }), {
    ...getRequestContext(req),
    event: "apartmentcategory.delete",
    module: "apartmentcategory",
  });

  res.status(200).json({ success: true, message: t("apartmentcategory.delete.success", { name }) });
});
