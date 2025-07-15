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

// 📥 GET /services (Public)
export const getAllServices = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Services } = await getTenantModels(req);

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

    const servicesList = await Services.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("log.listed"), {
      ...getRequestContext(req),
      event: "services.public_list",
      module: "services",
      resultCount: servicesList.length,
    });

    res.status(200).json({
      success: true,
      message: "Services list fetched successfully.",
      data: servicesList,
    });
  }
);

// 📥 GET /services/:id (Public)
export const getServicesById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Services } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "services.public_getById",
        module: "services",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const services = await Services.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!services) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "services.public_getById",
        module: "services",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "services.public_getById",
      module: "services",
      servicesId: services._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: services,
    });
  }
);

// 📥 GET /services/slug/:slug (Public)
export const getServicesBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { Services } = await getTenantModels(req);
    const { slug } = req.params;

    const services = await Services.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!services) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "services.public_getBySlug",
        module: "services",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "services.public_getBySlug",
      module: "services",
      slug,
      servicesId: services._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: services,
    });
  }
);
