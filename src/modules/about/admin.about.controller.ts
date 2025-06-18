import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { About } from ".";
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

function parseIfJsonString(value: any) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function processUploadedImages(files: Express.Multer.File[]) {
  const images = [];

  for (const file of files) {
    const imageUrl = getImagePath(file);
    let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
    let publicId = (file as any).public_id;

    if (shouldProcessImage()) {
      const processed = await processImageLocal(
        file.path,
        file.filename,
        path.dirname(file.path)
      );
      thumbnail = processed.thumbnail;
      webp = processed.webp;
    }

    images.push({ url: imageUrl, thumbnail, webp, publicId });
  }

  return images;
}

// ✅ Create About
export const createAbout = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } =
    req.body;

  title = parseIfJsonString(title);
  summary = parseIfJsonString(summary);
  content = parseIfJsonString(content);
  const { About } = await getTenantModels(req);

  const images = Array.isArray(req.files)
    ? await processUploadedImages(req.files as Express.Multer.File[])
    : [];

  const slug = slugify(title?.en || title?.tr || title?.de || "about", {
    lower: true,
    strict: true,
  });

  const about = await About.create({
    title,
    slug,
    summary,
    tenant: req.tenant,
    content,
    category:
      isValidObjectId(category) && category !== "" ? category : undefined,
    isPublished: isPublished === "true" || isPublished === true,
    publishedAt: isPublished ? publishedAt || new Date() : undefined,
    images,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "About created successfully.",
    data: about,
  });
});

// ✅ Admin - Get All About
export const adminGetAllAbout = asyncHandler(
  async (req: Request, res: Response) => {
    const { language, category, isPublished, isActive } = req.query;
    const { About } = await getTenantModels(req);

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

    const aboutList = await About.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "About list fetched successfully.",
      data: aboutList,
    });
  }
);

// ✅ Admin - Get About By ID
export const adminGetAboutById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { About } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid About ID." });
      return;
    }

    const about = await About.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!about || !about.isActive) {
      res
        .status(404)
        .json({ success: false, message: "About not found or inactive." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "About fetched successfully.",
      data: about,
    });
  }
);

// ✅ Update About
export const updateAbout = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const { About } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid About ID." });
    return;
  }

  const about = await About.findOne({ _id: id, tenant: req.tenant });
  if (!about) {
    res.status(404).json({ success: false, message: "About not found." });
    return;
  }

  const parsedUpdates = {
    title: parseIfJsonString(updates.title),
    summary: parseIfJsonString(updates.summary),
    content: parseIfJsonString(updates.content),
    tags: parseIfJsonString(updates.tags),
    category: updates.category,
    isPublished: updates.isPublished,
    publishedAt: updates.publishedAt,
  };

  Object.entries(parsedUpdates).forEach(([key, value]) => {
    if (value !== undefined) {
      (about as any)[key] = value;
    }
  });

  if (Array.isArray(req.files)) {
    const newImages = await processUploadedImages(
      req.files as Express.Multer.File[]
    );
    about.images.push(...newImages);
  }

  if (updates.removedImages) {
    try {
      const removed: any[] = JSON.parse(updates.removedImages);
      about.images = about.images.filter(
        (img: any) => !removed.includes(img.url)
      );

      for (const imgUrl of removed) {
        const filename = path.basename(imgUrl);
        const localPath = path.join("uploads", "about-images", filename);
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

        const match = about.images.find(
          (img: any) => img.url === imgUrl && img.publicId
        );
        if (match && match.publicId) {
          await cloudinary.uploader.destroy(match.publicId);
        }
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await about.save();

  res.status(200).json({
    success: true,
    message: "About updated successfully.",
    data: about,
  });
});

// ✅ Delete About
export const deleteAbout = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { About } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid About ID." });
    return;
  }

  const about = await About.findOne({ _id: id, tenant: req.tenant });
  if (!about) {
    res.status(404).json({ success: false, message: "About not found." });
    return;
  }

  for (const img of about.images) {
    const localPath = path.join(
      "uploads",
      "about-images",
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

  await about.deleteOne();

  res.status(200).json({
    success: true,
    message: "About deleted successfully.",
  });
});
