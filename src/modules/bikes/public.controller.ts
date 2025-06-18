import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Bike } from "@/modules/bikes";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "../bikes/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get All Published Products (Public)
export const getAllBike = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;

  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Bike } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }

  if (onlyLocalized === "true") {
    filter[`name.${locale}`] = { $exists: true };
  }

  const products = await Bike.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  logger.info(t("log.listed"), {
    ...getRequestContext(req),
    event: "bike.public_list",
    module: "bike",
    resultCount: products.length,
  });

  res.status(200).json({
    success: true,
    message: t("log.listed"),
    data: products,
  });
});

// ✅ Get Single Product by ID (Public)
export const getBikeById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Bike } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.warn(t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "bike.public_getById",
      module: "bike",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const product = await Bike.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name")
    .lean();

  if (!product) {
    logger.warn(t("error.not_found"), {
      ...getRequestContext(req),
      event: "bike.public_getById",
      module: "bike",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.info(t("log.fetched"), {
    ...getRequestContext(req),
    event: "bike.public_getById",
    module: "bike",
    bikeId: product._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: product,
  });
});

// ✅ Get Product by Slug (Public)
export const getBikeBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { Bike } = await getTenantModels(req);
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);

    if (!slug || typeof slug !== "string") {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Bike.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name slug")
      .lean();

    if (!product) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "bike.public_getBySlug",
        module: "bike",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "bike.public_getBySlug",
      module: "bike",
      slug,
      bikeId: product._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: product,
    });
  }
);
