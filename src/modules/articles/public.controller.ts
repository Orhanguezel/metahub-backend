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

// 📥 GET /articles (Public)
export const getAllArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
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
      filter[`name.${locale}`] = { $exists: true };
    }

    const articlesList = await Articles.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.info(t("log.listed"), {
      ...getRequestContext(req),
      event: "articles.public_list",
      module: "articles",
      resultCount: articlesList.length,
    });

    res.status(200).json({
      success: true,
      message: "Articles list fetched successfully.",
      data: articlesList,
    });
  }
);

// 📥 GET /articles/:id (Public)
export const getArticlesById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Articles } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.warn(t("error.invalid_id"), {
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
      .populate("category", "title")
      .lean();

    if (!articles) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "articles.public_getById",
        module: "articles",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "articles.public_getById",
      module: "articles",
      articlesId: articles._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: articles,
    });
  }
);

// 📥 GET /articles/slug/:slug (Public)
export const getArticlesBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
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
      .populate("category", "title")
      .lean();

    if (!articles) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "articles.public_getBySlug",
        module: "articles",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "articles.public_getBySlug",
      module: "articles",
      slug,
      articlesId: articles._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: articles,
    });
  }
);
