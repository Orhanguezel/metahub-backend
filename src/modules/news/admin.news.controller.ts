import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { News } from "@/modules/news";
import { INews } from "@/modules/news/news.models";
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
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

export const createNews = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } =
    req.body;

  const { News } = await getTenantModels(req);

  title = parseIfJson(title);
  summary = parseIfJson(summary);
  content = parseIfJson(content);
  tags = parseIfJson(tags);

  const images: INews["images"] = [];

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

  const slug = slugify(title?.en || title?.tr || title?.de || "news", {
    lower: true,
    strict: true,
  });

  const news = await News.create({
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

  res
    .status(201)
    .json({ success: true, message: "News created successfully.", data: news });
});

export const adminGetAllNews = asyncHandler(
  async (req: Request, res: Response) => {
    const { News } = await getTenantModels(req);
    const { language, category, isPublished, isActive } = req.query;
    const filter: Record<string, any> = { tenant: req.tenant };

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

    const newsList = await News.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "News list fetched successfully.",
      data: newsList,
    });
  }
);

export const adminGetNewsById = asyncHandler(
  async (req: Request, res: Response) => {
    const { News } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid news ID." });
      return;
    }

    const news = await News.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!news || !news.isActive) {
      res
        .status(404)
        .json({ success: false, message: "News not found or inactive." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "News fetched successfully.",
      data: news,
    });
  }
);

export const updateNews = asyncHandler(async (req: Request, res: Response) => {
  const { News } = await getTenantModels(req);
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findOne({ _id: id, tenant: req.tenant });
  if (!news) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  const updatableFields: (keyof INews)[] = [
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
      (news as any)[field] = updates[field];
    }
  });

  if (!Array.isArray(news.images)) news.images = [];

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

      news.images.push({
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
      news.images = news.images.filter(
        (img: any) => !removed.includes(img.url)
      );

      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          "news-images",
          path.basename(img.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await news.save();

  res
    .status(200)
    .json({ success: true, message: "News updated successfully.", data: news });
});

export const deleteNews = asyncHandler(async (req: Request, res: Response) => {
  const { News } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid news ID." });
    return;
  }

  const news = await News.findOne({ _id: id, tenant: req.tenant });
  if (!news) {
    res.status(404).json({ success: false, message: "News not found." });
    return;
  }

  for (const img of news.images) {
    const localPath = path.join(
      "uploads",
      "news-images",
      path.basename(img.url)
    );
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error(`Cloudinary delete error for ${img.publicId}:`, err);
      }
    }
  }

  await news.deleteOne();

  res
    .status(200)
    .json({ success: true, message: "News deleted successfully." });
});
