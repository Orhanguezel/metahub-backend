import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Articles } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Articles (public)
export const getAllArticles = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const filter: any = { isActive: true, isPublished: true };

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  // Add language-specific check: only return Articles that has that language field
  if (language && ["tr", "en", "de"].includes(language.toString())) {
    filter[`title.${language}`] = { $exists: true };
  }
  const defaultPopulate = [
    { path: "comments" },
    { path: "category", select: "title" },
  ];

  const articlesList = await Articles.find(filter)
    .populate(defaultPopulate)
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Articles list fetched successfully.",
    data: articlesList,
  });
});

// ✅ Get Articles by ID (public)
export const getArticlesById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Articles ID." });
    return;
  }

  const articles = await Articles.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "title")
    .lean();

  if (!articles) {
    res.status(404).json({ success: false, message: "Articles not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Articles fetched successfully.",
    data: articles,
  });
});

// ✅ Get Articles by Slug (public)
export const getArticlesBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { slug } = req.params;

    const articles = await Articles.findOne({ slug, isActive: true, isPublished: true })
      .populate("comments")
      .populate("category", "title")
      .lean();

    if (!articles) {
      res.status(404).json({ success: false, message: "Articles not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Articles fetched successfully.",
      data: articles,
    });
  }
);
