import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Blog } from ".";
import { isValidObjectId } from "@/core/utils/validation";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Tek noktadan blog için çeviri fonksiyonu (user response veya log için kullanılabilir)
function blogT(
  key: string,
  locale?: SupportedLocale,
  vars?: Record<string, any>
) {
  return t(key, locale || getLogLocale(), translations, vars);
}

// ✅ Get All Blog (public)
export const getAllBlog = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const userLocale: SupportedLocale =
    (req.locale as SupportedLocale) ||
    (typeof language === "string" &&
    SUPPORTED_LOCALES.includes(language as SupportedLocale)
      ? (language as SupportedLocale)
      : (process.env.LOG_LOCALE as SupportedLocale) || "en");

  const filter: any = { isActive: true, isPublished: true, tenant: req.tenant };

  // Dinamik kategori filtresi
  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  // Dinamik dil kontrolü
  if (language && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true, $ne: "" };
  }

  const defaultPopulate = [
    { path: "comments" },
    { path: "category", select: "title" },
  ];

  const { Blog } = await getTenantModels(req);
  const blogList = await Blog.find(filter)
    .populate(defaultPopulate)
    .sort({ createdAt: -1 })
    .lean();

  // Log sistem diliyle
  logger.info(
    blogT("blog.log.public_list", getLogLocale(), { count: blogList.length })
  );

  // Response user diliyle
  res.status(200).json({
    success: true,
    message: blogT("blog.list.success", userLocale, { count: blogList.length }),
    data: blogList,
  });
});

// ✅ Get Blog by ID (public)
export const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language } = req.query;
  const userLocale: SupportedLocale =
    (req.locale as SupportedLocale) ||
    (typeof language === "string" &&
    SUPPORTED_LOCALES.includes(language as SupportedLocale)
      ? (language as SupportedLocale)
      : (process.env.LOG_LOCALE as SupportedLocale) || "en");

  if (!isValidObjectId(id)) {
    logger.warn(blogT("blog.log.invalid_id", getLogLocale(), { id }));
    res.status(400).json({
      success: false,
      message: blogT("blog.invalid_id", userLocale, { id }),
    });
    return;
  }

  const { Blog } = await getTenantModels(req);
  const blog = await Blog.findOne({
    _id: id,
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "title")
    .lean();

  if (!blog) {
    logger.warn(blogT("blog.log.not_found", getLogLocale(), { id }));
    res.status(404).json({
      success: false,
      message: blogT("blog.not_found", userLocale, { id }),
    });
    return;
  }

  logger.info(blogT("blog.log.public_detail", getLogLocale(), { id }));
  res.status(200).json({
    success: true,
    message: blogT("blog.detail.success", userLocale),
    data: blog,
  });
});

// ✅ Get Blog by Slug (public)
export const getBlogBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { language } = req.query;
    const userLocale: SupportedLocale =
      (req.locale as SupportedLocale) ||
      (typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
        ? (language as SupportedLocale)
        : (process.env.LOG_LOCALE as SupportedLocale) || "en");

    const { Blog } = await getTenantModels(req);
    const blog = await Blog.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!blog) {
      logger.warn(blogT("blog.log.not_found_slug", getLogLocale(), { slug }));
      res.status(404).json({
        success: false,
        message: blogT("blog.not_found", userLocale, { slug }),
      });
      return;
    }

    logger.info(blogT("blog.log.public_detail_slug", getLogLocale(), { slug }));
    res.status(200).json({
      success: true,
      message: blogT("blog.detail.success", userLocale),
      data: blog,
    });
  }
);
