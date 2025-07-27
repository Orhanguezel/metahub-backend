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

// 📥 GET /portfolio (Public)
export const getAllPortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Portfolio } = await getTenantModels(req);

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

    const portfolioList = await Portfolio.find(filter)
      .populate("comments")
      .sort({ createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("log.listed"), {
      ...getRequestContext(req),
      event: "portfolio.public_list",
      module: "portfolio",
      resultCount: portfolioList.length,
    });

    res.status(200).json({
      success: true,
      message: t("log.listed"),
      data: portfolioList,
    });
  }
);

// 📥 GET /portfolio/:id (Public)
export const getPortfolioById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Portfolio } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "portfolio.public_getById",
        module: "portfolio",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const portfolio = await Portfolio.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .lean();

    if (!portfolio) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "portfolio.public_getById",
        module: "portfolio",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "portfolio.public_getById",
      module: "portfolio",
      portfolioId: portfolio._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: portfolio,
    });
  }
);

// 📥 GET /portfolio/slug/:slug (Public)
export const getPortfolioBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { Portfolio } = await getTenantModels(req);
    const { slug } = req.params;

    const portfolio = await Portfolio.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .lean();

    if (!portfolio) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "portfolio.public_getBySlug",
        module: "portfolio",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "portfolio.public_getBySlug",
      module: "portfolio",
      slug,
      portfolioId: portfolio._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: portfolio,
    });
  }
);
