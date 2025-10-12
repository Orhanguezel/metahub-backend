import { Request, Response, RequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";

const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

function normalizeAboutusItem(item: any) {
  const emptyTags = LOCALES.reduce((acc, l) => {
    acc[l] = [];
    return acc;
  }, {} as Record<SupportedLocale, string[]>);

  const src = item?.tags && typeof item.tags === "object" ? item.tags : {};
  const normTags: Record<SupportedLocale, string[]> = { ...emptyTags };

  for (const l of LOCALES) {
    const v = (src as any)[l];
    normTags[l] = Array.isArray(v)
      ? [...new Set(v.map(String).map((s) => s.trim()).filter(Boolean))]
      : [];
  }

  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [],
    tags: normTags,
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
}

export const getAllAboutus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { category, onlyLocalized } = req.query as { category?: string; onlyLocalized?: string };
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Aboutus } = await getTenantModels(req);

  const filter: Record<string, any> = {
    tenant: (req as any).tenant,
    isActive: true,
    isPublished: true,
  };

  if (typeof category === "string" && isValidObjectId(category)) filter.category = category;
  if (onlyLocalized === "true") filter[`title.${locale}`] = { $exists: true, $ne: "" };

  const aboutList = await Aboutus.find(filter)
    .populate("comments")
    .populate("category", "name slug")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const normalizedList = (aboutList || []).map(normalizeAboutusItem);

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "about.public_list",
    module: "about",
    resultCount: normalizedList.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: normalizedList });
});

export const getAboutusById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Aboutus } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("error.invalid_id"), {
      ...getRequestContext(req),
      event: "about.public_getById",
      module: "about",
      status: "fail",
      id,
    });
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const about = await Aboutus.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
    tenant: (req as any).tenant,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!about) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "about.public_getById",
      module: "about",
      status: "fail",
      id,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeAboutusItem(about);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "about.public_getById",
    module: "about",
    aboutId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});

export const getAboutusBySlug: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = ((req as any).locale as SupportedLocale) || getLogLocale() || "en";
  const t = (key: string) => translate(key, locale, translations);
  const { Aboutus } = await getTenantModels(req);
  const { slug } = req.params;

  const about = await Aboutus.findOne({
    [`slugLower.${locale}`]: String(slug).toLowerCase(),
    tenant: (req as any).tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name slug")
    .lean();

  if (!about) {
    logger.withReq.warn(req, t("error.not_found"), {
      ...getRequestContext(req),
      event: "about.public_getBySlug",
      module: "about",
      status: "fail",
      slug,
    });
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  const normalized = normalizeAboutusItem(about);

  logger.withReq.info(req, t("log.fetched"), {
    ...getRequestContext(req),
    event: "about.public_getBySlug",
    module: "about",
    slug,
    aboutId: normalized._id,
  });

  res.status(200).json({ success: true, message: t("log.fetched"), data: normalized });
});
