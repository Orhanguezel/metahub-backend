import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { EnsotekProd, IEnsotekProd } from ".";
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

// ✅ CREATE
export const createEnsotekProd = asyncHandler(async (req: Request, res: Response) => {
  let { name, description, tags, category, isPublished, price, stock, stockThreshold } = req.body;

  name = parseIfJson(name);
  description = parseIfJson(description);
  tags = parseIfJson(tags);

  const images: IEnsotekProd["images"] = [];

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

  const slug = slugify(name?.en || name?.tr || name?.de || "ensotek-product", {
    lower: true,
    strict: true,
  });

  const prod = await EnsotekProd.create({
    name,
    slug,
    description,
    tags,
    category: isValidObjectId(category) ? category : undefined,
    price,
    stock,
    stockThreshold,
    isPublished: isPublished === "true" || isPublished === true,
    images,
    isActive: true,
  });

  res.status(201).json({ success: true, message: "Product created successfully.", data: prod });
});

// ✅ UPDATE
export const updateEnsotekProd = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid product ID." });
    return;
  }

  const prod = await EnsotekProd.findById(id);
  if (!prod) {
    res.status(404).json({ success: false, message: "Product not found." });
    return;
  }

  const updatableFields: (keyof IEnsotekProd)[] = [
    "name", "description", "tags", "category", "price", "stock", "stockThreshold", "isPublished"
  ];

  updatableFields.forEach((field) => {
    if (updates[field] !== undefined) {
      (prod as any)[field] = parseIfJson(updates[field]);
    }
  });

  if (!Array.isArray(prod.images)) prod.images = [];

  if (Array.isArray(req.files)) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);

      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      prod.images.push({
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
      prod.images = prod.images.filter((img: any) => !removed.includes(img.url));

      for (const img of removed) {
        const localPath = path.join("uploads", "ensotekProd-images", path.basename(img.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    } catch (e) {
      console.warn("Invalid removedImages JSON:", e);
    }
  }

  await prod.save();

  res.status(200).json({ success: true, message: "Product updated successfully.", data: prod });
});

// ✅ DELETE
export const deleteEnsotekProd = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid product ID." });
    return;
  }

  const prod = await EnsotekProd.findById(id);
  if (!prod) {
    res.status(404).json({ success: false, message: "Product not found." });
    return;
  }

  for (const img of prod.images) {
    const localPath = path.join("uploads", "ensotekProd-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }
  }

  await prod.deleteOne();

  res.status(200).json({ success: true, message: "Product deleted successfully." });
});

// ✅ GET ALL
export const adminGetAllEnsotekProd = asyncHandler(async (_req: Request, res: Response) => {
  const prodList = await EnsotekProd.find()
    .populate("comments")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, message: "Product list fetched successfully.", data: prodList });
});

// ✅ GET BY ID
export const adminGetEnsotekProdById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid product ID." });
    return;
  }

  const prod = await EnsotekProd.findById(id)
    .populate("comments")
    .populate("category", "name")
    .lean();

  if (!prod || !prod.isActive) {
    res.status(404).json({ success: false, message: "Product not found or inactive." });
    return;
  }

  res.status(200).json({ success: true, message: "Product fetched successfully.", data: prod });
});
