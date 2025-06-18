import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Blog } from "@/modules/blog";
import type { IBlog } from "@/modules/blog/types";
import { isValidObjectId } from "@/core/utils/validation";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/utils/uploadUtils";
import logger from "@/core/middleware/logger/logger";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Yardımcı çeviri fonksiyonu
function blogT(
  key: string,
  locale?: SupportedLocale,
  vars?: Record<string, any>
) {
  return t(key, locale || getLogLocale(), translations, vars);
}

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ Blog oluşturma
export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } =
    req.body;
  // Locale öncelik sırası: req.locale > query.language > env > "en"
  const reqLang =
    (req.locale as SupportedLocale) ||
    (typeof req.query.language === "string" &&
    SUPPORTED_LOCALES.includes(req.query.language as SupportedLocale)
      ? (req.query.language as SupportedLocale)
      : (process.env.LOG_LOCALE as SupportedLocale) || "en");

  title = parseIfJson(title);
  summary = parseIfJson(summary);
  content = parseIfJson(content);
  tags = parseIfJson(tags);

  const images: IBlog["images"] = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      let imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);

      if (shouldProcessImage()) {
        const processed = await processImageLocal(
          file.path,
          file.filename,
          path.dirname(file.path)
        );
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      images.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }
  }

  let slugBase: string | undefined = undefined;
  for (const locale of SUPPORTED_LOCALES) {
    if (title?.[locale]) {
      slugBase = title[locale];
      break;
    }
  }
  const slug = slugify(slugBase || "Blog", { lower: true, strict: true });
  const { Blog } = await getTenantModels(req);

  const blog = await Blog.create({
    title,
    slug,
    tenant: req.tenant,
    summary,
    content,
    tags,
    category: isValidObjectId(category) ? category : undefined,
    isPublished: isPublished === "true" || isPublished === true,
    publishedAt: isPublished ? publishedAt || new Date() : undefined,
    images,
    author: req.user?.name || "System",
    isActive: true,
  });

  logger.info(
    blogT("blog.log.created", getLogLocale(), { id: blog._id, slug: blog.slug })
  );

  res.status(201).json({
    success: true,
    message: blogT("blog.create.success", reqLang, {
      title: slugBase || "Blog",
    }),
    data: blog,
  });
});

// ✅ Tüm Blogları Getir (admin)
export const adminGetAllBlog = asyncHandler(
  async (req: Request, res: Response) => {
    const { language, category, isPublished, isActive } = req.query;
    const reqLang: SupportedLocale =
      (req.locale as SupportedLocale) ||
      (typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
        ? (language as SupportedLocale)
        : (process.env.LOG_LOCALE as SupportedLocale) || "en");
    const filter: Record<string, any> = { tenant: req.tenant };

    if (
      typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
    ) {
      filter[`title.${language}`] = { $exists: true, $ne: "" };
    }

    if (typeof category === "string" && isValidObjectId(category)) {
      filter.category = category;
    }

    if (typeof isPublished === "string") {
      filter.isPublished = isPublished === "true";
    }

    if (typeof isActive === "string") {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true;
    }

    const { Blog } = await getTenantModels(req);
    const blogList = await Blog.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    logger.info(
      blogT("blog.log.admin_list", getLogLocale(), { count: blogList.length })
    );

    res.status(200).json({
      success: true,
      message: blogT("blog.admin.list.success", reqLang, {
        count: blogList.length,
      }),
      data: blogList,
    });
  }
);

// ✅ Tek Blog Getir (admin)
export const adminGetBlogById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { language } = req.query;
    const reqLang: SupportedLocale =
      (req.locale as SupportedLocale) ||
      (typeof language === "string" &&
      SUPPORTED_LOCALES.includes(language as SupportedLocale)
        ? (language as SupportedLocale)
        : (process.env.LOG_LOCALE as SupportedLocale) || "en");

    if (!isValidObjectId(id)) {
      logger.warn(blogT("blog.log.invalid_id", getLogLocale(), { id }));
      res.status(400).json({
        success: false,
        message: blogT("blog.invalid_id", reqLang, { id }),
      });
      return;
    }

    const { Blog } = await getTenantModels(req);
    const blog = await Blog.findOne({
      _id: id,
      tenant: req.tenant,
    })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!blog || !blog.isActive) {
      logger.warn(blogT("blog.log.not_found", getLogLocale(), { id }));
      res.status(404).json({
        success: false,
        message: blogT("blog.not_found", reqLang, { id }),
      });
      return;
    }

    logger.info(blogT("blog.log.admin_detail", getLogLocale(), { id }));
    res.status(200).json({
      success: true,
      message: blogT("blog.admin.detail.success", reqLang),
      data: blog,
    });
  }
);

// ✅ Blog Güncelle (admin)
export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const { language } = req.query;
  const reqLang: SupportedLocale =
    (req.locale as SupportedLocale) ||
    (typeof language === "string" &&
    SUPPORTED_LOCALES.includes(language as SupportedLocale)
      ? (language as SupportedLocale)
      : (process.env.LOG_LOCALE as SupportedLocale) || "en");

  if (!isValidObjectId(id)) {
    logger.warn(blogT("blog.log.invalid_id", getLogLocale(), { id }));
    res.status(400).json({
      success: false,
      message: blogT("blog.invalid_id", reqLang, { id }),
    });
    return;
  }

  const { Blog } = await getTenantModels(req);
  const blog = await Blog.findOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!blog) {
    logger.warn(blogT("blog.log.not_found", getLogLocale(), { id }));
    res.status(404).json({
      success: false,
      message: blogT("blog.not_found", reqLang, { id }),
    });
    return;
  }

  const updatableFields: (keyof IBlog)[] = [
    "title",
    "summary",
    "content",
    "tags",
    "category",
    "isPublished",
    "publishedAt",
  ];

  updatableFields.forEach((field) => {
    if (updates[field] !== undefined) {
      (blog as any)[field] = updates[field];
    }
  });

  if (!Array.isArray(blog.images)) blog.images = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);

      if (shouldProcessImage()) {
        const processed = await processImageLocal(
          file.path,
          file.filename,
          path.dirname(file.path)
        );
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      blog.images.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      blog.images = blog.images.filter(
        (img: any) => !removed.includes(img.url)
      );

      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          "blog-images",
          path.basename(img.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      logger.warn(blogT("blog.log.invalid_removed_images", getLogLocale()));
    }
  }

  await blog.save();
  logger.info(
    blogT("blog.log.updated", getLogLocale(), { id: blog._id, slug: blog.slug })
  );

  res.status(200).json({
    success: true,
    message: blogT("blog.update.success", reqLang, { id: blog._id }),
    data: blog,
  });
});

// ✅ Blog Sil (admin)
export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language } = req.query;
  const reqLang: SupportedLocale =
    (req.locale as SupportedLocale) ||
    (typeof language === "string" &&
    SUPPORTED_LOCALES.includes(language as SupportedLocale)
      ? (language as SupportedLocale)
      : (process.env.LOG_LOCALE as SupportedLocale) || "en");

  if (!isValidObjectId(id)) {
    logger.warn(blogT("blog.log.invalid_id", getLogLocale(), { id }));
    res.status(400).json({
      success: false,
      message: blogT("blog.invalid_id", reqLang, { id }),
    });
    return;
  }

  const { Blog } = await getTenantModels(req);
  const blog = await Blog.findOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!blog) {
    logger.warn(blogT("blog.log.not_found", getLogLocale(), { id }));
    res.status(404).json({
      success: false,
      message: blogT("blog.not_found", reqLang, { id }),
    });
    return;
  }

  for (const img of blog.images) {
    const localPath = path.join(
      "uploads",
      "blog-images",
      path.basename(img.url)
    );
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        logger.error(
          blogT("blog.log.cloudinary_delete_error", getLogLocale(), {
            publicId: img.publicId,
          })
        );
      }
    }
  }

  await blog.deleteOne();
  logger.info(
    blogT("blog.log.deleted", getLogLocale(), { id: blog._id, slug: blog.slug })
  );

  res.status(200).json({
    success: true,
    message: blogT("blog.delete.success", reqLang, { id: blog._id }),
  });
});
