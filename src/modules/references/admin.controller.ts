import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Reference } from "@/modules/references";
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

// Helper: JSON parse
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

// Helper: Image upload
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

// ✅ Create Reference
export const createReference = asyncHandler(async (req: Request, res: Response) => {
  let { title, summary, content, tags, category, isPublished, publishedAt } = req.body;

  title = parseIfJsonString(title);
  summary = parseIfJsonString(summary);
  content = parseIfJsonString(content);
  tags = parseIfJsonString(tags);

  const images = Array.isArray(req.files)
    ? await processUploadedImages(req.files as Express.Multer.File[])
    : [];

  const slug = slugify(title?.en || title?.tr || title?.de || "reference", {
    lower: true,
    strict: true,
  });

  const reference = await Reference.create({
    title,
    slug,
    summary,
    content,
    tags,
    category: isValidObjectId(category) && category !== "" ? category : undefined,
    isPublished: isPublished === "true" || isPublished === true,
    publishedAt: isPublished ? publishedAt || new Date() : undefined,
    images,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Reference created successfully.",
    data: reference,
  });
});

// ✅ Admin - Get All References
export const adminGetAllReferences = asyncHandler(async (req: Request, res: Response) => {
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

  const referenceList = await Reference.find(filter)
    .populate([{ path: "category", select: "name" }])
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Reference list fetched successfully.",
    data: referenceList,
  });
});

// ✅ Admin - Get Reference By ID
export const adminGetReferenceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Reference ID." });
    return;
  }

  const reference = await Reference.findById(id)
    .populate([{ path: "category", select: "name" }])
    .lean();

  if (!reference || !reference.isActive) {
    res.status(404).json({ success: false, message: "Reference not found or inactive." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Reference fetched successfully.",
    data: reference,
  });
});

// ✅ Update Reference
export const updateReference = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Reference ID." });
    return;
  }

  const reference = await Reference.findById(id);
  if (!reference) {
    res.status(404).json({ success: false, message: "Reference not found." });
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
      (reference as any)[key] = value;
    }
  });

  // Resim ekleme
  if (Array.isArray(req.files)) {
    const newImages = await processUploadedImages(req.files as Express.Multer.File[]);
    reference.images.push(...newImages);
  }

  // Resim silme
  if (updates.removedImages) {
    try {
      const removed: any[] = JSON.parse(updates.removedImages);
      reference.images = reference.images.filter((img: any) => !removed.includes(img.url));

      for (const imgUrl of removed) {
        const filename = path.basename(imgUrl);
        const localPath = path.join("uploads", "references-images", filename);
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

        const match = reference.images.find((img: any) => img.url === imgUrl && img.publicId);
        if (match && match.publicId) {
          await cloudinary.uploader.destroy(match.publicId);
        }
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await reference.save();

  res.status(200).json({
    success: true,
    message: "Reference updated successfully.",
    data: reference,
  });
});

// ✅ Delete Reference
export const deleteReference = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Reference ID." });
    return;
  }

  const reference = await Reference.findById(id);
  if (!reference) {
    res.status(404).json({ success: false, message: "Reference not found." });
    return;
  }

  for (const img of reference.images) {
    const localPath = path.join("uploads", "references-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error(`Cloudinary delete error for ${img.publicId}:`, err);
      }
    }
  }

  await reference.deleteOne();

  res.status(200).json({
    success: true,
    message: "Reference deleted successfully.",
  });
});
