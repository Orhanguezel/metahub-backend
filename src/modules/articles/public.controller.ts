// src/modules/articles/public.controller.ts
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

function normalizeArticlesItem(item: any) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

// GET /articles
export const getAllArticles: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query as { category?: string; onlyLocalized?: string };
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Articles } = await getTenantModels(req);

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

  const articlesList = await Articles.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const normalizedList = (articlesList || []).map(normalizeArticlesItem);

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "articles.public_list",
    module: "articles",
    resultCount: normalizedList.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: normalizedList });
});

// GET /articles/:id
export const getArticlesById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Articles } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "articles.public_getById",
      module: "articles",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const articles = await Articles.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: req.tenant,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!articles) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "articles.public_getById",
      module: "articles",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeArticlesItem(articles);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "articles.public_getById",
    module: "articles",
    articlesId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});

// GET /articles/slug/:slug
export const getArticlesBySlug: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Articles } = await getTenantModels(req);
  const { slug } = req.params;

  const articles = await Articles.findOne({
    slug,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!articles) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "articles.public_getBySlug",
      module: "articles",
      status: "fail",
      slug,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeArticlesItem(articles);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "articles.public_getBySlug",
    module: "articles",
    slug,
    articlesId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});
