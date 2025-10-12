import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "../ensotekprod/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get All Published Ensotekprod (Public)
export const getAllEnsotekprod = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Ensotekprod } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  // Filtre: kategori ID ile
  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }
  // Filtre: lokalize alan varsa (örn. sadece bu dilde başlık olan ürünler)
  if (onlyLocalized === "true") {
    filter[`name.${locale}`] = { $exists: true, $ne: "" };
  }

  const products = await Ensotekprod.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "ensotekprod.public_list",
    module: "ensotekprod",
    resultCount: products.length,
  });

  res.status(200).json({
    success: true,
    message: t("log.listed"),
    data: products,
  });
});

// ✅ Get Ensotekprod by ID (Public)
export const getEnsotekprodById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Ensotekprod } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "ensotekprod.public_getById",
      module: "ensotekprod",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const product = await Ensotekprod.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!product) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "ensotekprod.public_getById",
      module: "ensotekprod",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "ensotekprod.public_getById",
    module: "ensotekprod",
    ensotekprodId: product._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: product,
  });
});

// ✅ Get Ensotekprod by Slug (Public)
export const getEnsotekprodBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Ensotekprod } = await getTenantModels(req);

  if (!slug || typeof slug !== "string") {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const product = await Ensotekprod.findOne({
    slug,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!product) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "ensotekprod.public_getBySlug",
      module: "ensotekprod",
      status: "fail",
      slug,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "ensotekprod.public_getBySlug",
    module: "ensotekprod",
    slug,
    ensotekprodId: product._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: product,
  });
});
