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

// 📥 GET /massage (Public)
export const getAllMassage = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Massage } = await getTenantModels(req);

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

    const massageList = await Massage.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("log.listed"), {
      ...getRequestContext(req),
      event: "massage.public_list",
      module: "massage",
      resultCount: massageList.length,
    });

    res.status(200).json({
      success: true,
      message: t("log.listed"),
      data: massageList,
    });
  }
);

// 📥 GET /massage/:id (Public)
export const getMassageById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Massage } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "massage.public_getById",
        module: "massage",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const massage = await Massage.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "name slug")
      .lean();

    if (!massage) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "massage.public_getById",
        module: "massage",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "massage.public_getById",
      module: "massage",
      massageId: massage._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: massage,
    });
  }
);

// 📥 GET /massage/slug/:slug (Public)
export const getMassageBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { Massage } = await getTenantModels(req);
    const { slug } = req.params;

    const massage = await Massage.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name slug")
      .lean();

    if (!massage) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "massage.public_getBySlug",
        module: "massage",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "massage.public_getBySlug",
      module: "massage",
      slug,
      massageId: massage._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: massage,
    });
  }
);
