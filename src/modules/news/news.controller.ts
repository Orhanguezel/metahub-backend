import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import News from "./news.models";
import { isValidObjectId } from "@/core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import { deleteUploadedFiles } from "@/core/utils/deleteUploadedFiles";
import { setSlugFromTitle } from "@/core/utils/slugify";

// ✅ Create News
export const createNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, tags, isPublished, publishedAt } = req.body;
  const files = req.files as Express.Multer.File[];

  const imageUrls = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/news-images/${file.filename}`) || [];

  if (imageUrls.length === 0) {
    res.status(400).json({ success: false, message: "At least one image is required." });
    return;
  }

  const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
  const languages: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const createdNews = [];

  for (const lang of languages) {
    const title = req.body[`title_${lang}`];
    const summary = req.body[`summary_${lang}`];
    const content = req.body[`content_${lang}`];

    if (!title || !summary || !content) continue;

    const news = await News.create({
      title: { [lang]: title },
      slug: setSlugFromTitle(title),
      summary: { [lang]: summary },
      content: { [lang]: content },
      images: imageUrls,
      tags: parsedTags || [],
      category,
      author: req.user?.name || "System",
      language: lang,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
    });

    // 🛠 Save sonrası populate
    const populatedNews = await news.populate([
      { path: "comments" },
      { path: "category", select: "title" },
    ]);

    createdNews.push(populatedNews);
  }

  if (createdNews.length === 0) {
    res.status(400).json({ success: false, message: "No valid data provided for any language." });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Multi-language news created successfully.",
    data: createdNews,
  });
});


// ✅ Get All News
export const getAllNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, language } = req.query;
  const filter: any = {};

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  filter.language = language || req.locale || "en";

  const newsList = await News.find(filter)
    .populate("comments")
    .populate("category", "title")
    .sort({ publishedAt: -1 });

  res.status(200).json({
    success: true,
    message: "News list fetched successfully.",
    data: newsList,
  });
});

// ✅ Get News by Slug
export const getNewsBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const news = await News.findOne({ slug })
    .populate("comments")
    .populate("category", "title");

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

// ✅ Get News by ID
export const getNewsById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findById(id)
    .populate("comments")
    .populate("category", "title");

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

// ✅ Update News
// ✅ Update News
export const updateNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findById(id);
  if (!news) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  const updatableFields = ["title", "summary", "content", "author", "language"];
  updatableFields.forEach(field => {
    if (updates[field]) {
      news[field] = updates[field];
    }
  });

  if (updates.category && isValidObjectId(updates.category)) {
    news.category = updates.category;
  }

  if (updates.tags) {
    news.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
  }

  if (typeof updates.isPublished !== "undefined") {
    news.isPublished = updates.isPublished === "true" || updates.isPublished === true;
  }

  if (updates.publishedAt) {
    news.publishedAt = new Date(updates.publishedAt);
  }

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/news-images/${file.filename}`) || [];

  if (newImages.length > 0) {
    news.images.push(...newImages);
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      news.images = news.images.filter((img: string) => !removed.includes(img));
      await deleteUploadedFiles(removed, "news");
    } catch {}
  }

  await news.save();


  const populatedNews = await news.populate([
    { path: "comments" },
    { path: "category", select: "title" },
  ]);

  res.status(200).json({
    success: true,
    message: "News updated successfully.",
    data: populatedNews,
  });
});


// ✅ Delete News
export const deleteNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const deleted = await News.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "News deleted successfully.",
  });
});
