import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { isValidObjectId } from "@/core/utils/validation";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { fillAllLocalesArray } from "@/core/utils/i18n/fillAllLocalesArray";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";
import { mergeLocalesArrayForUpdate } from "@/core/utils/i18n/mergeLocalesArrayForUpdate";


// JSON string'i parse et, obje olarak dön
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

function normalizePricingItem(item: any) {
  // Sadece nesneyi döndür (gerekirse alanlar burada array normalization yapılır)
  return {
    ...item,
  };
}



// 📥 GET /admin/pricing
export const getAllPricingAdmin = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  const pricingList = await Pricing.find({ tenant: req.tenant })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const normalizedList = pricingList.map(normalizePricingItem);

  logger.withReq.info(req, t("log.admin_listed"), {
    ...getRequestContext(req),
    event: "pricing.admin_list",
    module: "pricing",
    resultCount: normalizedList.length,
  });

  res.status(200).json({
    success: true,
    message: t("log.admin_listed"),
    data: normalizedList,
  });
  return;
});

// 📥 GET /admin/pricing/:id
export const getPricingByIdAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "pricing.admin_getById",
      module: "pricing",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const pricing = await Pricing.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!pricing) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "pricing.admin_getById",
      module: "pricing",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizePricingItem(pricing);

  logger.withReq.info(req, t("log.admin_fetched"), {
    ...getRequestContext(req),
    event: "pricing.admin_getById",
    module: "pricing",
    pricingId: normalized._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.admin_fetched"),
    data: normalized,
  });
  return;
});

// 📥 POST /admin/pricing
export const createPricing = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  let {
    title,
    description,
    features,
    category,
    price,
    currency,
    period,
    isPublished,
    publishedAt,
    isPopular,
    order,
    isActive,
  } = req.body;

  // Çoklu dil otomatik doldurma
  title = fillAllLocales(parseIfJson(title));
  description = fillAllLocales(parseIfJson(description));
  features = fillAllLocalesArray(parseIfJson(features));

  // Zorunlu alan kontrolü
  if (!title || typeof price !== "number" || !currency || !period) {
    res.status(400).json({ success: false, message: t("error.missing_fields") });
    return;
  }

  // period: "monthly" | "yearly" | "once" dışında bir şey gelirse hata döndür!
  if (!["monthly", "yearly", "once"].includes(period)) {
    res.status(400).json({ success: false, message: t("error.invalid_period") });
    return;
  }

  const newPricing = await Pricing.create({
    title,
    tenant: req.tenant,
    description,
    features,
    category,
    price,
    currency,
    period,
    isPublished: !!isPublished,
    publishedAt,
    isPopular: !!isPopular,
    order: typeof order === "number" ? order : 0,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });

  logger.withReq.info(req, t("log.admin_created"), {
    ...getRequestContext(req),
    event: "pricing.admin_created",
    module: "pricing",
    pricingId: newPricing._id,
  });

  res.status(201).json({
    success: true,
    message: t("log.admin_created"),
    data: normalizePricingItem(newPricing.toObject()),
  });
  return;
});

// 📥 PUT /admin/pricing/:id
export const updatePricing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const pricing = await Pricing.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!pricing) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const updates = req.body;

  if (updates.title) {
    pricing.title = mergeLocalesForUpdate(pricing.title, parseIfJson(updates.title));
  }
  if (updates.description) {
    pricing.description = mergeLocalesForUpdate(pricing.description, parseIfJson(updates.description));
  }
 if (updates.features) {
  pricing.features = mergeLocalesArrayForUpdate(
    pricing.features || {},
    parseIfJson(updates.features)
  );
}


  const updatableFields: (keyof typeof pricing)[] = [
    "title",
    "description",
    "features",
    "category",
    "price",
    "currency",
    "period",
    "isPublished",
    "publishedAt",
    "isPopular",
    "order",
    "isActive",
  ];

  for (const field of updatableFields) {
    if (updates[field] !== undefined) (pricing as any)[field] = updates[field];
  }

  // Tenant overwrite güvenliği
  pricing.tenant = req.tenant;

  const updated = await Pricing.findOneAndUpdate(
    { _id: id, tenant: req.tenant },
    pricing,
    { new: true, lean: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.admin_updated"), {
    ...getRequestContext(req),
    event: "pricing.admin_updated",
    module: "pricing",
    pricingId: updated._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.admin_updated"),
    data: normalizePricingItem(updated),
  });
  return;
});

// 📥 DELETE /admin/pricing/:id
export const deletePricing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const deleted = await Pricing.findOneAndDelete({ _id: id, tenant: req.tenant });

  if (!deleted) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.admin_deleted"), {
    ...getRequestContext(req),
    event: "pricing.admin_deleted",
    module: "pricing",
    pricingId: deleted._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.admin_deleted"),
    data: normalizePricingItem(deleted.toObject ? deleted.toObject() : deleted),
  });
  return;
});
