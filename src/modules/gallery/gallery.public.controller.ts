import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import translations from "./i18n";
import { IGalleryItem } from "./types";

export const getPublishedGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { page = "1", limit = "10", category } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const filters: any = {
        isPublished: true,
        isActive: true,
        tenant: req.tenant,
      };
      if (category) filters.category = category;

      const [items, total] = await Promise.all([
        Gallery.find(filters)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Gallery.countDocuments(filters),
      ]);

      res.status(200).json({
        success: true,
        message: t("galleryItemsFetched"),
        data: items,
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_items"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_items") });
    }
  }
);

export const getPublishedGalleryItemsByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { category } = req.params;

      if (!category) {
        res
          .status(400)
          .json({ success: false, message: t("categoryRequired") });
        return;
      }

      const items = await Gallery.find({
        category,
        tenant: req.tenant,
        isPublished: true,
        isActive: true,
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        message: t("galleryItemsByCategoryFetched"),
        data: items,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_items"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_items") });
    }
  }
);

export const getGalleryCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const categories = await Gallery.distinct("category", {
        tenant: req.tenant,
      });

      res.status(200).json({
        success: true,
        message: t("galleryCategoriesFetched"),
        data: categories,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_categories"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_categories") });
    }
  }
);

export const searchGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const {
        search,
        isPublished,
        isActive,
        category,
        page = "1",
        limit = "10",
      } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const filters: any = { tenant: req.tenant };
      if (category) filters.category = category;
      if (typeof isPublished !== "undefined")
        filters.isPublished = isPublished === "true";
      if (typeof isActive !== "undefined")
        filters.isActive = isActive === "true";

      if (search) {
        const [field, value] = (search as string).split(":");
        filters[field] = { $regex: value, $options: "i" };
      }

      const [items, total] = await Promise.all([
        Gallery.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Gallery.countDocuments(filters),
      ]);

      res.status(200).json({
        success: true,
        message: t("filteredGalleryItemsFetched"),
        data: items,
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.searching_items"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.searching_items") });
    }
  }
);

export const getGalleryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const [total, published, active, categories] = await Promise.all([
        Gallery.countDocuments({ tenant: req.tenant }),
        Gallery.countDocuments({ isPublished: true, tenant: req.tenant }),
        Gallery.countDocuments({ isActive: true, tenant: req.tenant }),
        Gallery.aggregate([
          { $match: { tenant: req.tenant } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
      ]);

      const categoriesData = categories.reduce((acc, cur) => {
        acc[cur._id] = cur.count;
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        message: t("galleryStatsFetched"),
        data: {
          total,
          published,
          active,
          categories: categoriesData,
        },
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_stats"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_stats") });
    }
  }
);

export const getGalleryItemById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: t("invalidGalleryId") });
        return;
      }

      const item = await Gallery.findOne({
        _id: id,
        tenant: req.tenant,
      }).lean();
      if (!item) {
        res
          .status(404)
          .json({ success: false, message: t("galleryItemNotFound") });
        return;
      }

      res.status(200).json({
        success: true,
        message: t("galleryItemFetched"),
        data: item,
      });
    } catch (err: any) {
      logger.withReq.error(req, t("error.fetching_item"), {
        module: "gallery",
        error: err.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.fetching_item") });
    }
  }
);
