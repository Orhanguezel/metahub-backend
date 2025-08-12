import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { SUPPORTED_LOCALES } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

// utils
const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

// 📥 GET /servicecatalog (Public)
export const getAllServiceCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, onlyLocalized, isActive } = req.query;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { ServiceCatalog } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: req.tenant,
  };

  // public listede default: yalnız aktifler
  if (typeof isActive === "string") {
    filter.isActive = isActive === "true";
  } else {
    filter.isActive = true;
  }

  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }

  // Sadece seçili locale için adı olan kayıtlar
  if (onlyLocalized === "true" && SUPPORTED_LOCALES.includes(locale)) {
    filter[`name.${locale}`] = { $exists: true, $ne: "" };
  }

  // Text search (name.*) — schema'da text index var
  if (typeof q === "string" && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  const query = ServiceCatalog.find(filter)
    .populate([{ path: "category", select: "name slug" }])
    .sort(filter.$text ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .lean();

  const list = await query;

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "servicecatalog.public_list",
    module: "servicecatalog",
    resultCount: list.length,
  });

  res.status(200).json({
    success: true,
    message: t("log.listed"),
    data: list,
  });
});

// 📥 GET /servicecatalog/:id (Public)
export const getServiceCatalogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { ServiceCatalog } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "servicecatalog.public_getById",
      module: "servicecatalog",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const doc = await ServiceCatalog.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
  })
    .populate([{ path: "category", select: "name slug" }])
    .lean();

  if (!doc) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "servicecatalog.public_getById",
      module: "servicecatalog",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "servicecatalog.public_getById",
    module: "servicecatalog",
    serviceCatalogId: doc._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: doc,
  });
});

// 📥 GET /servicecatalog/code/:code (Public)
export const getServiceCatalogByCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { ServiceCatalog } = await getTenantModels(req);

  const codeNorm = toUpperSnake(code || "");
  if (!codeNorm) {
    res.status(400).json({ success: false, message: t("error.invalid_code") });
    return;
  }

  const doc = await ServiceCatalog.findOne({
    tenant: req.tenant,
    code: codeNorm,
    isActive: true,
  })
    .populate([{ path: "category", select: "name slug" }])
    .lean();

  if (!doc) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "servicecatalog.public_getByCode",
      module: "servicecatalog",
      status: "fail",
      code: codeNorm,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "servicecatalog.public_getByCode",
    module: "servicecatalog",
    code: codeNorm,
    serviceCatalogId: doc._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: doc,
  });
});
