import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Sport } from "./sport.models";
import { ISport } from "./types/index";
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

// ✅ CREATE SPORT
export const createSport = asyncHandler(async (req: Request, res: Response) => {
  const { Sport } = await getTenantModels(req);
  let {
    title,
    summary,
    content,
    tags,
    category,
    isPublished,
    publishedAt,
    tenant,
  } = req.body;

  title = parseIfJson(title);
  summary = parseIfJson(summary);
  content = parseIfJson(content);
  tags = parseIfJson(tags);

  const images: ISport["images"] = [];

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

  const slug = slugify(title?.en || title?.tr || title?.de || "sport", {
    lower: true,
    strict: true,
  });

  const sport = await Sport.create({
    title,
    tenant,
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

  res.status(201).json({
    success: true,
    message: "Sport created successfully.",
    data: sport,
  });
});

// ✅ GET ALL (ADMIN)
export const adminGetAllSport = asyncHandler(
  async (req: Request, res: Response) => {
    const { Sport } = await getTenantModels(req);
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

    const list = await Sport.find(filter)
      .populate([{ path: "category", select: "title" }])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Sport list fetched successfully.",
      data: list,
    });
  }
);

// ✅ GET BY ID
export const adminGetSportById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Sport } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid Sport ID." });
      return;
    }

    const sport = await Sport.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "category", select: "title" }])
      .lean();

    if (!sport || !sport.isActive) {
      res
        .status(404)
        .json({ success: false, message: "Sport not found or inactive." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Sport fetched successfully.",
      data: sport,
    });
  }
);

// ✅ UPDATE
export const updateSport = asyncHandler(async (req: Request, res: Response) => {
  const { Sport } = await getTenantModels(req);
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Sport ID." });
    return;
  }

  const sport = await Sport.findOne({ _id: id, tenant: req.tenant });
  if (!sport) {
    res.status(404).json({ success: false, message: "Sport not found." });
    return;
  }

  const updatableFields: (keyof ISport)[] = [
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
      (sport as any)[field] = updates[field];
    }
  });

  if (!Array.isArray(sport.images)) sport.images = [];

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

      sport.images.push({
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
      sport.images = sport.images.filter(
        (img: any) => !removed.includes(img.url)
      );

      for (const img of removed) {
        const localPath = path.join(
          "uploads",
          "Sport-images",
          path.basename(img.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await sport.save();

  res.status(200).json({
    success: true,
    message: "Sport updated successfully.",
    data: sport,
  });
});

// ✅ DELETE
export const deleteSport = asyncHandler(async (req: Request, res: Response) => {
  const { Sport } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Sport ID." });
    return;
  }

  const sport = await Sport.findOne({ _id: id, tenant: req.tenant });
  if (!sport) {
    res.status(404).json({ success: false, message: "Sport not found." });
    return;
  }

  for (const img of sport.images) {
    const localPath = path.join(
      "uploads",
      "Sport-images",
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

  await sport.deleteOne();

  res
    .status(200)
    .json({ success: true, message: "Sport deleted successfully." });
});

export const publicGetAllSport = asyncHandler(
  async (req: Request, res: Response) => {
    const { Sport } = await getTenantModels(req);
    const sports = await Sport.find({
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    })
      .populate({ path: "category", select: "title" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Sport list fetched successfully.",
      data: sports,
    });
  }
);
