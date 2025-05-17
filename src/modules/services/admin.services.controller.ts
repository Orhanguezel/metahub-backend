import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Services, IServices } from ".";
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
      const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
      thumbnail = processed.thumbnail;
      webp = processed.webp;
    }

    images.push({ url: imageUrl, thumbnail, webp, publicId });
  }

  return images;
}

// ✅ Create Services
export const createServices = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } = req.body;

  title = parseIfJsonString(title);
  summary = parseIfJsonString(summary);
  content = parseIfJsonString(content);
  tags = parseIfJsonString(tags);

  const images = Array.isArray(req.files)
    ? await processUploadedImages(req.files as Express.Multer.File[])
    : [];

  const slug = slugify(title?.en || title?.tr || title?.de || "services", {
    lower: true,
    strict: true,
  });

  const services = await Services.create({
    title,
    slug,
    summary,
    content,
    tags,
    category: isValidObjectId(category) && category !== "" ? category : undefined,
    isPublished: isPublished === "true" || isPublished === true,
    publishedAt: isPublished ? publishedAt || new Date() : undefined,
    images,
    price: req.body.price ? Number(req.body.price) : undefined,
    durationMinutes: req.body.durationMinutes ? Number(req.body.durationMinutes) : undefined,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Services created successfully.",
    data: services,
  });
});

// ✅ Admin - Get All Services
export const adminGetAllServices = asyncHandler(async (req: Request, res: Response) => {
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

  const servicesList = await Services.find(filter)
    .populate([{ path: "comments", strictPopulate: false }, { path: "category", select: "name" }])
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Services list fetched successfully.",
    data: servicesList,
  });
});

// ✅ Admin - Get Services By ID
export const adminGetServicesById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Services ID." });
    return;
  }

  const services = await Services.findById(id)
    .populate([{ path: "comments" }, { path: "category", select: "title" }])
    .lean();

  if (!services || !services.isActive) {
    res.status(404).json({ success: false, message: "Services not found or inactive." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Services fetched successfully.",
    data: services,
  });
});

// ✅ Update Services
export const updateServices = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Services ID." });
    return;
  }

  const services = await Services.findById(id);
  if (!services) {
    res.status(404).json({ success: false, message: "Services not found." });
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
    price: updates.price ? Number(updates.price) : undefined,
    durationMinutes: updates.durationMinutes ? Number(updates.durationMinutes) : undefined,
  };

  Object.entries(parsedUpdates).forEach(([key, value]) => {
    if (value !== undefined) {
      (services as any)[key] = value;
    }
  });

  if (Array.isArray(req.files)) {
    const newImages = await processUploadedImages(req.files as Express.Multer.File[]);
    services.images.push(...newImages);
  }

  if (updates.removedImages) {
    try {
      const removed: any[] = JSON.parse(updates.removedImages);
      services.images = services.images.filter((img: any) => !removed.includes(img.url));

      for (const imgUrl of removed) {
        const filename = path.basename(imgUrl);
        const localPath = path.join("uploads", "services-images", filename);
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

        const match = services.images.find((img: any) => img.url === imgUrl && img.publicId);
        if (match && match.publicId) {
          await cloudinary.uploader.destroy(match.publicId);
        }
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await services.save();

  res.status(200).json({
    success: true,
    message: "Services updated successfully.",
    data: services,
  });
});

// ✅ Delete Services
export const deleteServices = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Services ID." });
    return;
  }

  const services = await Services.findById(id);
  if (!services) {
    res.status(404).json({ success: false, message: "Services not found." });
    return;
  }

  for (const img of services.images) {
    const localPath = path.join("uploads", "services-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error(`Cloudinary delete error for ${img.publicId}:`, err);
      }
    }
  }

  await services.deleteOne();

  res.status(200).json({
    success: true,
    message: "Services deleted successfully.",
  });
});
