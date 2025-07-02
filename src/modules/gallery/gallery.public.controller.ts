import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { extractMultilangValue } from "@/core/utils/i18n/parseMultilangField";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import {  SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { IGallerySubItem } from "./types";

// ✅ Get published gallery items
export const getPublishedGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
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

    // Ensuring the proper typing for the item
    const data = items.map((item: any) => ({
      ...item,
      title: extractMultilangValue(item.title, locale),
      description: extractMultilangValue(item.description, locale),
    }));

    res.status(200).json({
      success: true,
      message: t("galleryItemsFetched"),
      data,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);


// ✅ Get published gallery items by category
export const getPublishedGalleryItemsByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
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

    const data = items.map((item: any) => ({
      ...item,
      title: extractMultilangValue(item.title, locale),
      description: extractMultilangValue(item.description, locale),
    }));

    res.status(200).json({
      success: true,
      message: t("galleryItemsByCategoryFetched"),
      data,
    });
  }
);


// ✅ Get gallery categories
export const getGalleryCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    const categories = await Gallery.distinct("category", {
      tenant: req.tenant,
    });

    res.status(200).json({
      success: true,
      message: t("galleryCategoriesFetched"),
      data: categories,
    });
  }
);


// ✅ Search + filter
export const searchGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

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
    if (typeof isActive !== "undefined") filters.isActive = isActive === "true";

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

    const data = items.map((item: any) => ({
      ...item,
      title: extractMultilangValue(item.title, locale),
      description: extractMultilangValue(item.description, locale),
    }));

    res.status(200).json({
      success: true,
      message: t("filteredGalleryItemsFetched"),
      data,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);


// ✅ Dashboard stats
export const getGalleryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    const [total, published, active, categories] = await Promise.all([
      Gallery.countDocuments({ tenant: req.tenant }),
      Gallery.countDocuments({ isPublished: true, tenant: req.tenant }),
      Gallery.countDocuments({ isActive: true, tenant: req.tenant }),
      Gallery.aggregate([
        { $match: { tenant: req.tenant } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const categoriesData = categories.map((category) => ({
      ...category,
      title: extractMultilangValue(category._id, locale), // Kategori başlığını dil bazlı alıyoruz
    }));

    res.status(200).json({
      success: true,
      message: t("galleryStatsFetched"),
      data: {
        total,
        published,
        active,
        categories: categoriesData.reduce((acc, cur) => {
          acc[cur._id] = cur.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  }
);

// ✅ Get gallery item by ID
export const getGalleryItemById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Gallery } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);
    const { id } = req.params;

    // Validate ObjectId
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("invalidGalleryId") });
      return;
    }

    // Fetch gallery item from the database
    const item = await Gallery.findOne({ _id: id, tenant: req.tenant }).lean();

    // If item not found
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: t("galleryItemNotFound") });
      return;
    }

    // Assuming the item structure includes localized fields for title and description
    const data = {
      ...item,
      items: item.items.map((subItem: IGallerySubItem) => ({
        ...subItem,
        title: extractMultilangValue(subItem.title, locale),  // Localized title
        description: extractMultilangValue(subItem.description, locale),  // Localized description
      })),
    };

    res.status(200).json({
      success: true,
      message: t("galleryItemFetched"),
      data,
    });
  }
);




// ✅ Get published gallery categories (only isActive: true)
export const getPublishedGalleryCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { GalleryCategory } = await getTenantModels(req);
    const t = (key: string) => translate(key, locale, translations);

    const categories = await GalleryCategory.find({
      isActive: true,
      tenant: req.tenant,
    })
      .sort({ createdAt: -1 })
      .lean();

    const data = categories.map((category:any) => ({
      ...category,
      title: extractMultilangValue(category.title, locale),
    }));

    res.status(200).json({
      success: true,
      message: t("galleryCategoriesFetched"),
      data,
    });
  }
);
