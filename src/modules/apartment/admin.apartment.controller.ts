// 📁 modules/apartment/controllers/apartment.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
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
} from "@/core/middleware/file/uploadUtils";
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

// ✅ Create Apartment
export const createApartment = asyncHandler(
  async (req: Request, res: Response) => {
    let { title, description, tags, category, isPublished, publishedAt } =
      req.body;
    const { Apartment } = await getTenantModels(req);

    title = parseIfJsonString(title);
    description = parseIfJsonString(description);
    tags = parseIfJsonString(tags);

    const images = Array.isArray(req.files)
      ? await processUploadedImages(req.files as Express.Multer.File[])
      : [];

    const slug = slugify(title?.en || title?.tr || title?.de || "apartment", {
      lower: true,
      strict: true,
    });

    const apartment = await Apartment.create({
      title,
      slug,
      tenant: req.tenant,
      description,
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
      message: "Apartment created successfully.",
      data: apartment,
    });
  }
);

// ✅ Admin - Get All Apartments
export const adminGetAllApartments = asyncHandler(
  async (req: Request, res: Response) => {
    const { language, category, isPublished, isActive } = req.query;
    const { Apartment } = await getTenantModels(req);

    const filter: Record<string, any> = {
      tenant: req.tenant,
    };

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

    const apartments = await Apartment.find(filter)
      .populate("category", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Apartment list fetched successfully.",
      data: apartments,
    });
  }
);

// ✅ Admin - Get Apartment By ID
export const adminGetApartmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Apartment } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid apartment ID." });
      return;
    }

    const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant })
      .populate("category", "title")
      .lean();

    if (!apartment || !apartment.isActive) {
      res
        .status(404)
        .json({ success: false, message: "Apartment not found or inactive." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Apartment fetched successfully.",
      data: apartment,
    });
  }
);

// ✅ Update Apartment
export const updateApartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const { Apartment } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid apartment ID." });
      return;
    }

    const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
    if (!apartment) {
      res.status(404).json({ success: false, message: "Apartment not found." });
      return;
    }

    const parsedUpdates = {
      title: parseIfJsonString(updates.title),
      description: parseIfJsonString(updates.description),
      tags: parseIfJsonString(updates.tags),
      category: updates.category,
      isPublished: updates.isPublished,
      publishedAt: updates.publishedAt,
    };

    Object.entries(parsedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        (apartment as any)[key] = value;
      }
    });

    if (Array.isArray(req.files)) {
      const newImages = await processUploadedImages(
        req.files as Express.Multer.File[]
      );
      apartment.images.push(...newImages);
    }

    if (updates.removedImages) {
      try {
        const removed: any[] = JSON.parse(updates.removedImages);
        apartment.images = apartment.images.filter(
          (img: any) => !removed.includes(img.url)
        );

        for (const imgUrl of removed) {
          const filename = path.basename(imgUrl);
          const localPath = path.join("uploads", req.tenant, "apartment-images", filename);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

          const match = apartment.images.find(
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

    await apartment.save();

    res.status(200).json({
      success: true,
      message: "Apartment updated successfully.",
      data: apartment,
    });
  }
);

// ✅ Delete Apartment
export const deleteApartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Apartment } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid apartment ID." });
      return;
    }

    const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
    if (!apartment) {
      res.status(404).json({ success: false, message: "Apartment not found." });
      return;
    }

    for (const img of apartment.images) {
      const localPath = path.join(
        "uploads",
        req.tenant,
        "apartment-images",
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

    await apartment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Apartment deleted successfully.",
    });
  }
);
