import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "../references/i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

/* ortak */
const toSlug = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ✅ CREATE — slug: body.slug varsa normalize, yoksa name.en’den üret */
export const createReferencesCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const name = fillAllLocales(req.body.name);
  const incomingSlug = typeof req.body.slug === "string" ? toSlug(req.body.slug) : "";

  try {
    const { ReferencesCategory } = await getTenantModels(req);
    const category = await ReferencesCategory.create({
      name,
      tenant: req.tenant,
      slug: incomingSlug || toSlug(name.en || Object.values(name).find(Boolean) || "category"),
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
    });

    logger.withReq.info(req, t("referencescategory.create.success", { name: name[locale] }), {
      ...getRequestContext(req),
      event: "referencescategory.create",
      module: "referencescategory",
      status: "success",
    });

    res.status(201).json({
      success: true,
      message: t("referencescategory.create.success", { name: name[locale] }),
      data: category,
    });
  } catch (err: any) {
    /* Duplicate key (tenant+slug) -> 409 */
    const isDup = err?.code === 11000 && err?.keyPattern && err?.keyPattern["tenant"] && err?.keyPattern["slug"];
    logger.withReq.error(req, t("referencescategory.create.error"), {
      ...getRequestContext(req),
      event: "referencescategory.create",
      module: "referencescategory",
      status: "fail",
      error: err.message,
    });

    res.status(isDup ? 409 : 500).json({
      success: false,
      message: isDup ? t("referencescategory.slug.duplicate") : t("referencescategory.create.error"),
    });
  }
});

/* ✅ GET ALL */
export const getAllReferencesCategories = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);

  try {
    const { ReferencesCategory } = await getTenantModels(req);
    const filter: Record<string, any> = { tenant: req.tenant };
    if (req.query.isActive) filter.isActive = req.query.isActive === "true";

    const categories = await ReferencesCategory.find(filter).sort({ createdAt: -1 }).lean();

    logger.withReq.info(req, t("referencescategory.list.success"), {
      ...getRequestContext(req),
      event: "referencescategory.list",
      module: "referencescategory",
      resultCount: categories.length,
    });

    res.status(200).json({
      success: true,
      message: t("referencescategory.list.success"),
      data: categories,
    });
  } catch (err: any) {
    logger.withReq.error(req, t("referencescategory.list.error"), {
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
});

/* ✅ GET BY ID */
export const getReferencesCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("referencescategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("referencescategory.invalidId") });
    return;
  }

  const { ReferencesCategory } = await getTenantModels(req);
  const category = await ReferencesCategory.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!category) {
    logger.withReq.warn(req, t("referencescategory.notFound"), getRequestContext(req));
    res.status(404).json({ success: false, message: t("referencescategory.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("referencescategory.fetch.success"),
    data: category,
  });
});

/* ✅ (Yeni) GET BY SLUG — public kullanım için faydalı olabilir */
export const getReferencesCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { slug } = req.params;

  const { ReferencesCategory } = await getTenantModels(req);
  const category = await ReferencesCategory.findOne({
    tenant: req.tenant,
    slug: toSlug(slug),
  }).lean();

  if (!category) {
    res.status(404).json({ success: false, message: t("referencescategory.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("referencescategory.fetch.success"),
    data: category,
  });
});

/* ✅ UPDATE — slug manuel verildiyse normalize edip kaydet;
   ayrıca ?regenSlug=en ile name.en’den yeniden üretme opsiyonu. */
export const updateReferencesCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;
  const { name, isActive } = req.body;
  const { regenSlug } = req.query as Record<string, string | undefined>;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("referencescategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("referencescategory.invalidId") });
    return;
  }

  const { ReferencesCategory } = await getTenantModels(req);
  const category = await ReferencesCategory.findOne({ _id: id, tenant: req.tenant });
  if (!category) {
    res.status(404).json({ success: false, message: t("referencescategory.notFound") });
    return;
  }

  if (name) {
    category.name = mergeLocalesForUpdate(category.name, name);
  }
  if (typeof isActive === "boolean") {
    category.isActive = isActive;
  }

  // slug güncelleme — öncelik body.slug, sonra regenSlug=en ise name.en'den üret
  if (typeof req.body.slug === "string" && req.body.slug.trim()) {
    category.slug = toSlug(req.body.slug);
  } else if (regenSlug === "en") {
    const base = category.name?.en || Object.values(category.name || {}).find(Boolean) || "category";
    category.slug = toSlug(base as string);
  }

  try {
    await category.save();
  } catch (err: any) {
    const isDup = err?.code === 11000 && err?.keyPattern && err?.keyPattern["tenant"] && err?.keyPattern["slug"];
    res.status(isDup ? 409 : 500).json({
      success: false,
      message: isDup ? t("referencescategory.slug.duplicate") : t("referencescategory.update.error"),
    });
    return;
  }

  logger.withReq.info(
    req,
    t("referencescategory.update.success", { name: category.name[locale] }),
    { ...getRequestContext(req), event: "referencescategory.update", module: "referencescategory", status: "success" }
  );

  res.status(200).json({
    success: true,
    message: t("referencescategory.update.success", { name: category.name[locale] }),
    data: category,
  });
});

/* ✅ DELETE (değişmedi) */
export const deleteReferencesCategory = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: Record<string, any>) =>
    translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("referencescategory.invalidId"), getRequestContext(req));
    res.status(400).json({ success: false, message: t("referencescategory.invalidId") });
    return;
  }

  const { ReferencesCategory } = await getTenantModels(req);
  const deleted = await ReferencesCategory.findOneAndDelete({ _id: id, tenant: req.tenant });

  if (!deleted) {
    res.status(404).json({ success: false, message: t("referencescategory.notFound") });
    return;
  }

  const name = deleted.name?.[locale] || "Category";
  logger.withReq.info(req, t("referencescategory.delete.success", { name }), {
    ...getRequestContext(req),
    event: "referencescategory.delete",
    module: "referencescategory",
    status: "success",
  });

  res.status(200).json({ success: true, message: t("referencescategory.delete.success", { name }) });
});
