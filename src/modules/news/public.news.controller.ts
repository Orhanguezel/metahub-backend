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
import type { INews } from "./types";

// 📥 GET /news (Public)
export const getAllNews = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { News } = await getTenantModels(req);

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

  const newsList = await News.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  logger.info(t("log.listed"), {
    ...getRequestContext(req),
    event: "news.public_list",
    module: "news",
    resultCount: newsList.length,
  });

  res.status(200).json({
    success: true,
    message: "News list fetched successfully.",
    data: newsList,
  });
});

// 📥 GET /news/:id (Public)
export const getNewsById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale =
    (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { News } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.warn(t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "news.public_getById",
      module: "news",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const news = (await News.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: req.tenant,
  })
    .populate("comments")
    .populate("category", "title")
    .lean()) as unknown as INews | null;

  if (!news) {
    logger.warn(t("error.not_found"), {
      ...getRequestContext(req),
      event: "news.public_getById",
      module: "news",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }
  logger.info(t("log.fetched"), {
    ...getRequestContext(req),
    event: "news.public_getById",
    module: "news",
    newsId: news._id,
  });

  res.status(200).json({
    success: true,
    message: t("log.fetched"),
    data: news,
  });
});

// 📥 GET /news/slug/:slug (Public)
export const getNewsBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { News } = await getTenantModels(req);
    const { slug } = req.params;

    const news = (await News.findOne({
      slug,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean()) as unknown as INews | null;

    if (!news) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "news.public_getBySlug",
        module: "news",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "news.public_getBySlug",
      module: "news",
      slug,
      newsId: news._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: news,
    });
  }
);
