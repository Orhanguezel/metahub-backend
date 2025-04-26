// src/modules/news/admin.news.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import News from "./news.models";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Admin - Get All News (Advanced filter)
export const adminGetAllNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { language, category, isPublished } = req.query;
  const filter: any = {};

  if (language) filter.language = language;
  if (category && isValidObjectId(category as string)) filter.category = category;
  if (isPublished !== undefined) filter.isPublished = isPublished === "true";

  const newsList = await News.find(filter)
    .populate([
      { path: "comments" },
      { path: "category", select: "title" },
    ])
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "News list fetched successfully.",
    data: newsList,
  });
});

// ✅ Admin - Get Single News by ID
export const adminGetNewsById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findById(id)
    .populate([
      { path: "comments" },
      { path: "category", select: "title" },
    ]);

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
