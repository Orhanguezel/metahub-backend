// src/modules/news/public.controller.ts
import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

function normalizeNewsItem(item: any) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

// GET /news
export const getAllNews: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query as { category?: string; onlyLocalized?: string };
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
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
    filter[`title.${locale}`] = { $exists: true };
  }

  const newsList = await News.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const normalizedList = (newsList || []).map(normalizeNewsItem);

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "news.public_list",
    module: "news",
    resultCount: normalizedList.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: normalizedList });
});

// GET /news/:id
export const getNewsById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { News } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "news.public_getById",
      module: "news",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const news = await News.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: req.tenant,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!news) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "news.public_getById",
      module: "news",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeNewsItem(news);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "news.public_getById",
    module: "news",
    newsId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});

// GET /news/slug/:slug
export const getNewsBySlug: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { News } = await getTenantModels(req);
  const { slug } = req.params;

  const news = await News.findOne({
    slug,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!news) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "news.public_getBySlug",
      module: "news",
      status: "fail",
      slug,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeNewsItem(news);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "news.public_getBySlug",
    module: "news",
    slug,
    newsId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});
