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

// --- Güvenli array normalization fonksiyonu ---
function normalizeTeamItem(item: any) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

// 📥 GET /team (Public)
export const getAllTeam = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Team } = await getTenantModels(req);

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

    const teamList = await Team.find(filter)
      .populate("comments")
      .sort({ createdAt: -1 })
      .lean();

    // --- Array normalization ---
    const normalizedList = (teamList || []).map(normalizeTeamItem);

    logger.withReq.info(req, t("log.listed"), {
      ...getRequestContext(req),
      event: "team.public_list",
      module: "team",
      resultCount: normalizedList.length,
    });

    res.status(200).json({
      success: true,
      message: t("log.listed"),
      data: normalizedList,
    });
  }
);

// 📥 GET /team/:id (Public)
export const getTeamById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Team } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "team.public_getById",
        module: "team",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const team = await Team.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .lean();

    if (!team) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "team.public_getById",
        module: "team",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    // --- Array normalization ---
    const normalized = normalizeTeamItem(team);

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "team.public_getById",
      module: "team",
      teamId: normalized._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: normalized,
    });
  }
);

// 📥 GET /team/slug/:slug (Public)
export const getTeamBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { Team } = await getTenantModels(req);
    const { slug } = req.params;

    const team = await Team.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .lean();

    if (!team) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "team.public_getBySlug",
        module: "team",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    // --- Array normalization ---
    const normalized = normalizeTeamItem(team);

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "team.public_getBySlug",
      module: "team",
      slug,
      teamId: normalized._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: normalized,
    });
  }
);
