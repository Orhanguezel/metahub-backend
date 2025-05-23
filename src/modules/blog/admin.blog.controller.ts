import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Blog } from "@/modules/blog";
import { IBlog } from "@/modules/blog/blog.models";
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

export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } = req.body;

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

  const slug = slugify(title?.en || title?.tr || title?.de || "Blog", {
    lower: true,
    strict: true,
  });

  const blog = await Blog.create({
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

  res.status(201).json({ success: true, message: "Blog created successfully.", data: blog });
});

export const adminGetAllBlog = asyncHandler(async (req: Request, res: Response) => {
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

  const blogList = await Blog.find(filter)
    .populate([{ path: "comments", strictPopulate: false }, { path: "category", select: "name" }])
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: "Blog list fetched successfully.", data: blogList });
});

export const adminGetBlogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid Blog ID." });
     return
  }

  const blog = await Blog.findById(id)
    .populate([{ path: "comments" }, { path: "category", select: "title" }])
    .lean();

  if (!blog || !blog.isActive) {
    res.status(404).json({ success: false, message: "Blog not found or inactive." });
    return 
  }

  res.status(200).json({ success: true, message: "Blog fetched successfully.", data: blog });
});

export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Blog ID." });
    return 
  }

  const blog = await Blog.findById(id);
  if (!blog) {
     res.status(404).json({ success: false, message: "Blog not found." });
     return
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
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
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
      blog.images = blog.images.filter((img: any) => !removed.includes(img.url));

      for (const img of removed) {
        const localPath = path.join("uploads", "Blog-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await blog.save();

  res.status(200).json({ success: true, message: "Blog updated successfully.", data: blog });
});

export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid Blog ID." });
     return
  }

  const blog = await Blog.findById(id);
  if (!blog) {
     res.status(404).json({ success: false, message: "Blog not found." });
     return
  }

  for (const img of blog.images) {
    const localPath = path.join("uploads", "blog-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error(`Cloudinary delete error for ${img.publicId}:`, err);
      }
    }
  }

  await blog.deleteOne();

  res.status(200).json({ success: true, message: "Blog deleted successfully." });
});
