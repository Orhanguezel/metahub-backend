import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Articles, IArticles } from ".";
import { Comment } from "@/modules/comment";
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

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

export const createArticles = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } = req.body;

  title = parseIfJson(title);
  summary = parseIfJson(summary);
  content = parseIfJson(content);
  tags = parseIfJson(tags);

  const images: IArticles["images"] = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      let imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);

      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
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

  const slug = slugify(title?.en || title?.tr || title?.de || "articles", {
    lower: true,
    strict: true,
  });

  const articles = await Articles.create({
    title,
    slug,
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

  res.status(201).json({ success: true, message: "Articles created successfully.", data: articles });
});

export const adminGetAllArticles = asyncHandler(async (req: Request, res: Response) => {
  const { language, category, isPublished, isActive } = req.query;
  const filter: Record<string, any> = {};

  if (typeof language === "string" && ["tr", "en", "de"].includes(language)) {
    filter[`title.${language}`] = { $exists: true };
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

  const articlesList = await Articles.find(filter)
    .populate([{ path: "comments", strictPopulate: false }, { path: "category", select: "name" }])
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: "Articles list fetched successfully.", data: articlesList });
});

export const adminGetArticlesById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid Articles ID." });
     return
  }

  const articles = await Articles.findById(id)
    .populate([{ path: "comments" }, { path: "category", select: "title" }])
    .lean();

  if (!articles || !articles.isActive) {
    res.status(404).json({ success: false, message: "Articles not found or inactive." });
    return 
  }

  res.status(200).json({ success: true, message: "Articles fetched successfully.", data: articles });
});

export const updateArticles = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Articles ID." });
    return 
  }

  const articles = await Articles.findById(id);
  if (!articles) {
     res.status(404).json({ success: false, message: "Articles not found." });
     return
  }

  const updatableFields: (keyof IArticles)[] = [
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
      (articles as any)[field] = updates[field];
    }
  });

  if (!Array.isArray(articles.images)) articles.images = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);

      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      articles.images.push({
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
      articles.images = articles.images.filter((img: any) => !removed.includes(img.url));

      for (const img of removed) {
        const localPath = path.join("uploads", "articles-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await articles.save();

  res.status(200).json({ success: true, message: "Articles updated successfully.", data: articles });
});

export const deleteArticles = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid Articles ID." });
     return
  }

  const articles = await Articles.findById(id);
  if (!articles) {
     res.status(404).json({ success: false, message: "Articles not found." });
     return
  }

  for (const img of articles.images) {
    const localPath = path.join("uploads", "articles-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error(`Cloudinary delete error for ${img.publicId}:`, err);
      }
    }
  }

  await articles.deleteOne();

  res.status(200).json({ success: true, message: "Articles deleted successfully." });
});
