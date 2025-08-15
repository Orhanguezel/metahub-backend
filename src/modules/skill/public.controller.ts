// src/modules/skill/public.controller.ts
import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

function normalizeSkillItem(item: any) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

// GET /skill
export const getAllSkill: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query as { category?: string; onlyLocalized?: string };
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Skill } = await getTenantModels(req);

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

  const skillList = await Skill.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const normalizedList = (skillList || []).map(normalizeSkillItem);

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "skill.public_list",
    module: "skill",
    resultCount: normalizedList.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: normalizedList });
});

// GET /skill/:id
export const getSkillById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Skill } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "skill.public_getById",
      module: "skill",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const skill = await Skill.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: req.tenant,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!skill) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "skill.public_getById",
      module: "skill",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeSkillItem(skill);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "skill.public_getById",
    module: "skill",
    skillId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});

// GET /skill/slug/:slug
export const getSkillBySlug: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Skill } = await getTenantModels(req);
  const { slug } = req.params;

  const skill = await Skill.findOne({
    slug,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!skill) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "skill.public_getBySlug",
      module: "skill",
      status: "fail",
      slug,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeSkillItem(skill);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "skill.public_getBySlug",
    module: "skill",
    slug,
    skillId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});
