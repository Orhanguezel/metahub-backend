import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { News } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All News (public)
export const getAllNews = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const filter: any = { isActive: true, isPublished: true };

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  // Add language-specific check: only return news that has that language field
  if (language) {
    filter[`title.${language}`] = { $exists: true };
  }

  const newsList = await News.find(filter)
    .populate("comments")
    .populate("category", "title")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "News list fetched successfully.",
    data: newsList,
  });
});

// ✅ Get News by ID (public)
export const getNewsById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findOne({ _id: id, isActive: true, isPublished: true })
    .populate("comments")
    .populate("category", "title")
    .lean();

  if (!news) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "News fetched successfully.",
    data: news,
  });
});

// ✅ Get News by Slug (public)
export const getNewsBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const news = await News.findOne({ slug, isActive: true, isPublished: true })
    .populate("comments")
    .populate("category", "title")
    .lean();

  if (!news) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "News fetched successfully.",
    data: news,
  });
});
