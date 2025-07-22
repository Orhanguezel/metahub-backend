import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "../sparepart/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get All Published Sparepart (Public)
export const getAllSparepart = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, onlyLocalized } = req.query;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Sparepart } = await getTenantModels(req);

    const filter: Record<string, any> = {
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    };

    // Filtre: kategori ID ile
    if (typeof category === "string" && isValidObjectId(category)) {
      filter.category = category;
    }
    // Filtre: lokalize alan varsa (örn. sadece bu dilde başlık olan ürünler)
    if (onlyLocalized === "true") {
      filter[`name.${locale}`] = { $exists: true, $ne: "" };
    }

    const products = await Sparepart.find(filter)
      .populate("comments")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("log.listed"), {
      ...getRequestContext(req),
      event: "sparepart.public_list",
      module: "sparepart",
      resultCount: products.length,
    });

    res.status(200).json({
      success: true,
      message: t("log.listed"),
      data: products,
    });
  }
);

// ✅ Get Sparepart by ID (Public)
export const getSparepartById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Sparepart } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("error.invalid_id"), {
        ...getRequestContext(req),
        event: "sparepart.public_getById",
        module: "sparepart",
        status: "fail",
        id,
      });
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Sparepart.findOne({
      _id: id,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name slug")
      .lean();

    if (!product) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "sparepart.public_getById",
        module: "sparepart",
        status: "fail",
        id,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "sparepart.public_getById",
      module: "sparepart",
      sparepartId: product._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: product,
    });
  }
);

// ✅ Get Sparepart by Slug (Public)
export const getSparepartBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const locale: SupportedLocale =
      (req.locale as SupportedLocale) || getLogLocale() || "en";
    const t = (key: string) => translate(key, locale, translations);
    const { Sparepart } = await getTenantModels(req);

    if (!slug || typeof slug !== "string") {
      res.status(400).json({ success: false, message: t("error.invalid_id") });
      return;
    }

    const product = await Sparepart.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name slug")
      .lean();

    if (!product) {
      logger.withReq.warn(req, t("error.not_found"), {
        ...getRequestContext(req),
        event: "sparepart.public_getBySlug",
        module: "sparepart",
        status: "fail",
        slug,
      });
      res.status(404).json({ success: false, message: t("error.not_found") });
      return;
    }

    logger.withReq.info(req, t("log.fetched"), {
      ...getRequestContext(req),
      event: "sparepart.public_getBySlug",
      module: "sparepart",
      slug,
      sparepartId: product._id,
    });

    res.status(200).json({
      success: true,
      message: t("log.fetched"),
      data: product,
    });
  }
);
