import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { isValidObjectId } from "@/core/utils/validation";

// --- normalizePricingItem: Çoklu dil destekli fields ---
function normalizePricingItem(item: any) {
  // Özellikle features gibi Map alanlar JSON'a çevrildiğinde düz obje olur.
  // Burada gerekirse ek array normalization eklenebilir.
  return {
    ...item,
    features:
      item.features && typeof item.features === "object"
        ? Object.fromEntries(Object.entries(item.features))
        : {},
  };
}

// 📥 GET /pricing (Public, liste)
export const getAllPricing = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  // Kategoriye göre filtre
  if (typeof category === "string" && category.length > 0) {
    filter.category = category;
  }

  // Sadece seçili dilde başlık varsa göster
  if (onlyLocalized === "true") {
    filter[`title.${locale}`] = { $exists: true, $ne: "" };
  }

  const pricingList = await Pricing.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .lean();

  // Features ve diğer map alanları düzleştir
  const normalizedList = (pricingList || []).map(normalizePricingItem);

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "pricing.public_list",
    module: "pricing",
    resultCount: normalizedList.length,
  });

  res.status(200).json({
    success: true,
    message: t("log.listed"),
    data: normalizedList,
  });
  return;
});

// 📥 GET /pricing/:id (Public, tekil)
export const getPricingById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Pricing } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "pricing.public_getById",
      module: "pricing",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const pricing = await Pricing.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  }).lean();

  if (!pricing) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "pricing.public_getById",
      module: "pricing",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizePricingItem(pricing);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "pricing.public_getById",
    module: "pricing",
    pricingId: normalized._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: normalized,
  });
  return;
});
