import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

// 📥 GET /about (Public)
export const getAllAbout = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { About } = await getTenantModels(req);

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

  const aboutList = await About.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  logger.info(t("log.listed"), {
    ...getRequestContext(req),
    event: "about.public_list",
    module: "about",
    resultCount: aboutList.length,
  });

  res.status(200).json({
    success: true,
    message: "About list fetched successfully.",
    data: aboutList,
  });
});

// 📥 GET /about/:id (Public)
export const getAboutById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { About } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.warn(t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "about.public_getById",
        module: "about",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const about = await About.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!about) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "about.public_getById",
        module: "about",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "about.public_getById",
      module: "about",
      aboutId: about._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: about,
    });
  }
);

// 📥 GET /about/slug/:slug (Public)
export const getAboutBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { About } = await getTenantModels(req);
    const { slug } = req.params;

    const about = await About.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!about) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "about.public_getBySlug",
        module: "about",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "about.public_getBySlug",
      module: "about",
      slug,
      aboutId: about._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: about,
    });
  }
);
