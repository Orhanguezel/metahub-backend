import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

// 📥 GET /library (Public)
export const getAllLibrary = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Library } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }

  if (onlyLocalized === "true") {
    filter[`title.${locale}`] = { $exists: true, $ne: "" };
  }

  const libraryList = await Library.find(filter)
    .populate({ path: "comments", strictPopulate: false })
    .populate({ path: "category", select: "name slug" })
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "library.public_list",
    module: "library",
    resultCount: libraryList.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: libraryList });
});

// 📥 GET /library/:id (Public)
export const getLibraryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Library } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), { ...getRequestContext(req), event: "library.public_getById", module: "library", status: "fail", id });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const library = await Library.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: req.tenant,
  })
    .populate({ path: "comments", strictPopulate: false })
    .populate({ path: "category", select: "name slug" })
    .lean();

  if (!library) {
    logger.withReq.warn(req, t("error.not_found"), { ...getRequestContext(req), event: "library.public_getById", module: "library", status: "fail", id });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }
  logger.withReq.info(req, t("log.fetched"), { ...getRequestContext(req), event: "library.public_getById", module: "library", libraryId: library._id });

  res.status(200).json({ success: true, message: t("log.fetched"), data: library });
});

// 📥 GET /library/slug/:slug (Public)
export const getLibraryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Library } = await getTenantModels(req);
  const { slug } = req.params;

  const library = await Library.findOne({
    slug,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate({ path: "comments", strictPopulate: false })
    .populate({ path: "category", select: "name slug" })
    .lean();

  if (!library) {
    logger.withReq.warn(req, t("error.not_found"), { ...getRequestContext(req), event: "library.public_getBySlug", module: "library", status: "fail", slug });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  logger.withReq.info(req, t("log.fetched"), { ...getRequestContext(req), event: "library.public_getBySlug", module: "library", libraryId: library._id });

  res.status(200).json({ success: true, message: t("log.fetched"), data: library });
});
