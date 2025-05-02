import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import Article from "./articles.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";

// ✅ Create Article (Multi-language & Multi-image)
export const createArticle = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
    const files = req.files as Express.Multer.File[];
    const imageUrls =
      files?.map(
        (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/article-images/${file.filename}`
      ) || [];

    if (imageUrls.length === 0) {
      res.status(400).json({ success: false, message: "At least one image is required." });
      return;
    }

    const createdArticles = [];

    for (const lang of langs) {
      const data = req.body[lang];

      if (!data?.title || !data?.summary || !data?.content || !data?.slug || !data?.label)
        continue;

      const parsedTags =
        typeof data.tags === "string" ? JSON.parse(data.tags) : data.tags;

      const article = await Article.create({
        title: data.title,
        summary: data.summary,
        content: data.content,
        slug: data.slug,
        tags: parsedTags || [],
        category: data.category,
        isPublished:
          req.body.isPublished === "true" || req.body.isPublished === true,
        publishedAt: req.body.isPublished
          ? req.body.publishedAt || new Date()
          : undefined,
        author: req.user?.name,
        images: imageUrls,
        label: data.label,
      });

      createdArticles.push(article);
    }

    if (createdArticles.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid article data provided.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Multi-language articles created successfully.",
      data: createdArticles,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get All Articles (with category & language filter)
export const getAllArticles = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, language } = req.query;
    const filter: any = {};
    if (category) filter.category = category;
    if (language) filter.label = { $exists: true }; // dummy: all articles have label

    const articles = await Article.find(filter)
      .populate("comments")
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      message: "Articles fetched successfully.",
      data: articles,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get Article by Slug
export const getArticleBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const article = await Article.findOne({ slug: req.params.slug }).populate("comments");

    if (!article) {
      res.status(404).json({ success: false, message: "Article not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Article fetched successfully.",
      data: article,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get Article by ID
export const getArticleById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID." });
      return;
    }

    const article = await Article.findById(id).populate("comments");

    if (!article) {
      res.status(404).json({ success: false, message: "Article not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Article fetched successfully.",
      data: article,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Update Article
export const updateArticle = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID." });
      return;
    }

    const article = await Article.findById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "Article not found." });
      return;
    }

    const {
      title,
      summary,
      content,
      slug,
      category,
      tags,
      label,
      isPublished,
      publishedAt,
      removedImages,
    } = req.body;

    const files = req.files as Express.Multer.File[];
    const newImages =
      files?.map(
        (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/article-images/${file.filename}`
      ) || [];

    if (title) article.title = title;
    if (summary) article.summary = summary;
    if (content) article.content = content;
    if (slug) article.slug = slug;
    if (category) article.category = category;
    if (label) article.label = label;
    if (typeof isPublished !== "undefined")
      article.isPublished = isPublished === "true" || isPublished === true;
    if (publishedAt) article.publishedAt = new Date(publishedAt);

    if (tags) {
      try {
        article.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
      } catch {}
    }

    if (removedImages) {
      try {
        const toRemove = JSON.parse(removedImages);
        article.images = article.images.filter((img) => !toRemove.includes(img));
      } catch {}
    }

    if (newImages.length > 0) {
      article.images = [...article.images, ...newImages];
    }

    await article.save();

    res.status(200).json({
      success: true,
      message: "Article updated successfully.",
      data: await article.populate("comments"),
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Article
export const deleteArticle = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid article ID." });
      return;
    }

    const deleted = await Article.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Article not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Article deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});
