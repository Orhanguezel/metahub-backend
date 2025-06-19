import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { extractMultilangValue } from "@/core/utils/i18n/parseMultilangField";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 🚩 Helper: kategori nesnesi olup olmadığını kontrol et
function isPopulatedCategory(
  category: any
): category is { title: Record<SupportedLocale, string> } {
  return (
    typeof category === "object" && category !== null && "title" in category
  );
}

// 📥 GET /articles (Public)
export const getAllArticles = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
    const { category } = req.query;

    const filter: any = {
      isActive: true,
      tenant: req.tenant,
      isPublished: true,
    };

    if (category && isValidObjectId(category.toString())) {
      filter.category = category;
    }

    const articlesList = await Articles.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "title" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const data = articlesList.map((article) => ({
      ...article,
      title: extractMultilangValue(article.title, locale),
      summary: extractMultilangValue(article.summary, locale),
      content: extractMultilangValue(article.content, locale),
      category: isPopulatedCategory(article.category)
        ? {
            ...article.category,
            title: extractMultilangValue(article.category.title, locale),
          }
        : undefined,
    }));

    res.status(200).json({
      success: true,
      message: "Articles list fetched successfully.",
      data,
    });
  }
);

// 📥 GET /articles/:id (Public)
export const getArticlesById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid Articles ID." });
      return;
    }

    const article = await Articles.findOne({
      _id: id,
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!article) {
      res.status(404).json({ success: false, message: "Articles not found." });
      return;
    }

    const data = {
      ...article,
      title: extractMultilangValue(article.title, locale),
      summary: extractMultilangValue(article.summary, locale),
      content: extractMultilangValue(article.content, locale),
      category: isPopulatedCategory(article.category)
        ? {
            ...article.category,
            title: extractMultilangValue(article.category.title, locale),
          }
        : undefined,
    };

    res.status(200).json({
      success: true,
      message: "Articles fetched successfully.",
      data,
    });
  }
);

// 📥 GET /articles/slug/:slug (Public)
export const getArticlesBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const { Articles } = await getTenantModels(req);
    const { slug } = req.params;

    const article = await Articles.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!article) {
      res.status(404).json({ success: false, message: "Articles not found." });
      return;
    }

    const data = {
      ...article,
      title: extractMultilangValue(article.title, locale),
      summary: extractMultilangValue(article.summary, locale),
      content: extractMultilangValue(article.content, locale),
      category: isPopulatedCategory(article.category)
        ? {
            ...article.category,
            title: extractMultilangValue(article.category.title, locale),
          }
        : undefined,
    };

    res.status(200).json({
      success: true,
      message: "Articles fetched successfully.",
      data,
    });
  }
);
