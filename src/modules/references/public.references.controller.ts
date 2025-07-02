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
import type { IReferences } from "./types";

// 📥 GET /references (Public)
export const getAllReferences = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { References } = await getTenantModels(req);

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

    const referencesList = await References.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.info(t("log.listed"), {
      ...getRequestContext(req),
      event: "references.public_list",
      module: "references",
      resultCount: referencesList.length,
    });

    res.status(200).json({
      success: true,
      message: "References list fetched successfully.",
      data: referencesList,
    });
  }
);

// 📥 GET /references/:id (Public)
export const getReferencesById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { References } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.warn(t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "references.public_getById",
        module: "references",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const references = (await References.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean()) as unknown as IReferences | null;

    if (!references) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "references.public_getById",
        module: "references",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }
    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "references.public_getById",
      module: "references",
      referencesId: references._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: references,
    });
  }
);

// 📥 GET /references/slug/:slug (Public)
export const getReferencesBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string) => translate(key, locale, translations);
    const { References } = await getTenantModels(req);
    const { slug } = req.params;

    const references = (await References.findOne({
      slug,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean()) as unknown as IReferences | null;

    if (!references) {
      logger.warn(t("error.not_found"), {
        ...getRequestContext(req),
        event: "references.public_getBySlug",
        module: "references",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.info(t("log.fetched"), {
      ...getRequestContext(req),
      event: "references.public_getBySlug",
      module: "references",
      slug,
      referencesId: references._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: references,
    });
  }
);
