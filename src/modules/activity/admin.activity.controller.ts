import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Activity } from "@/modules/activity";
import { IActivity } from "@/modules/activity/activity.models";
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

// ✅ Create Activity
export const createActivity = asyncHandler(
  async (req: Request, res: Response) => {
    let { title, summary, content, tags, category, isPublished, publishedAt } =
      req.body;
    const { Activity } = await getTenantModels(req);

    title = parseIfJsonString(title);
    summary = parseIfJsonString(summary);
    content = parseIfJsonString(content);
    tags = parseIfJsonString(tags);

    const images = Array.isArray(req.files)
      ? await processUploadedImages(req.files as Express.Multer.File[])
      : [];

    const slug = slugify(title?.en || title?.tr || title?.de || "activity", {
      lower: true,
      strict: true,
    });

    const activity = await Activity.create({
      title,
      slug,
      summary,
      content,
      tenant: req.tenant,
      tags,
      category:
        isValidObjectId(category) && category !== "" ? category : undefined,
      isPublished: isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
      images,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Activity created successfully.",
      data: activity,
    });
  }
);

// ✅ Admin - Get All Activity
export const adminGetAllActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { language, category, isPublished, isActive } = req.query;
    const { Activity } = await getTenantModels(req);

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

    const activityList = await Activity.find(filter)
      .populate([
        { path: "comments", strictPopulate: false },
        { path: "category", select: "name" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Activity list fetched successfully.",
      data: activityList,
    });
  }
);

// ✅ Admin - Get Activity By ID
export const adminGetActivityById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Activity } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid Activity ID." });
      return;
    }

    const activity = await Activity.findOne({ _id: id, tenant: req.tenant })
      .populate([{ path: "comments" }, { path: "category", select: "title" }])
      .lean();

    if (!activity || !activity.isActive) {
      res
        .status(404)
        .json({ success: false, message: "Activity not found or inactive." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Activity fetched successfully.",
      data: activity,
    });
  }
);

// ✅ Update Activity
export const updateActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const { Activity } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid Activity ID." });
      return;
    }

    const activity = await Activity.findOne({ _id: id, tenant: req.tenant });
    if (!activity) {
      res.status(404).json({ success: false, message: "Activity not found." });
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
        (activity as any)[key] = value;
      }
    });

    if (Array.isArray(req.files)) {
      const newImages = await processUploadedImages(
        req.files as Express.Multer.File[]
      );
      activity.images.push(...newImages);
    }

    if (updates.removedImages) {
      try {
        const removed: any[] = JSON.parse(updates.removedImages);
        activity.images = activity.images.filter(
          (img: any) => !removed.includes(img.url)
        );

        for (const imgUrl of removed) {
          const filename = path.basename(imgUrl);
          const localPath = path.join("uploads", "activity-images", filename);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

          const match = activity.images.find(
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

    await activity.save();

    res.status(200).json({
      success: true,
      message: "Activity updated successfully.",
      data: activity,
    });
  }
);

// ✅ Delete Activity
export const deleteActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Activity } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid Activity ID." });
      return;
    }

    const activity = await Activity.findOne({ _id: id, tenant: req.tenant });
    if (!activity) {
      res.status(404).json({ success: false, message: "Activity not found." });
      return;
    }

    for (const img of activity.images) {
      const localPath = path.join(
        "uploads",
        "activity-images",
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

    await activity.deleteOne();

    res.status(200).json({
      success: true,
      message: "Activity deleted successfully.",
    });
  }
);
