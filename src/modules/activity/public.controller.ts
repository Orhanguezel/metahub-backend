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

// 📥 GET /activity (Public)
export const getAllActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Activity } = await getTenantModels(req);

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

    const activityList = await Activity.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.info(t("log.listed"), {
      ...getRequestContext(req),
      event: "activity.public_list",
      module: "activity",
      resultCount: activityList.length,
    });

    res.status(200).json({
      success: true,
      message: "Activity list fetched successfully.",
      data: activityList,
    });
  }
);

// 📥 GET /activity/:id (Public)
export const getActivityById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Activity } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.warn(t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "activity.public_getById",
        module: "activity",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const activity = await Activity.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!activity) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "activity.public_getById",
        module: "activity",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "activity.public_getById",
      module: "activity",
      activityId: activity._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: activity,
    });
  }
);

// 📥 GET /activity/slug/:slug (Public)
export const getActivityBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { Activity } = await getTenantModels(req);
    const { slug } = req.params;

    const activity = await Activity.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!activity) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "activity.public_getBySlug",
        module: "activity",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "activity.public_getBySlug",
      module: "activity",
      slug,
      activityId: activity._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: activity,
    });
  }
);
