import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { RadonarProd } from "@/modules/radonarprod";
import { IRadonarProd } from "@/modules/radonarprod/radonarprod.model";
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

// JSON dönüştürme
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// ✅ CREATE
export const createRadonarProd = asyncHandler(
  async (req: Request, res: Response) => {
    let {
      name,
      description,
      tags,
      category,
      brand,
      price,
      stock,
      stockThreshold,
      frameMaterial,
      brakeType,
      wheelSize,
      gearCount,
      suspensionType,
      color,
      weightKg,
      isElectric,
      batteryRangeKm,
      motorPowerW,
      isPublished,
    } = req.body;

    name = parseIfJson(name);
    description = parseIfJson(description);
    tags = parseIfJson(tags);
    color = parseIfJson(color);

    const images: IRadonarProd["images"] = [];

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

    const slug = slugify(
      name?.en || name?.tr || name?.de || brand || "radonar-product",
      {
        lower: true,
        strict: true,
      }
    );

    const product = await RadonarProd.create({
      name,
      slug,
      description,
      tags,
      category: isValidObjectId(category) ? category : undefined,
      brand,
      price,
      stock,
      stockThreshold,
      frameMaterial,
      brakeType,
      wheelSize,
      gearCount,
      suspensionType,
      color,
      weightKg,
      isElectric,
      batteryRangeKm,
      motorPowerW,
      isPublished: isPublished === "true" || isPublished === true,
      images,
      isActive: true,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully.",
        data: product,
      });
  }
);

// ✅ UPDATE
export const updateRadonarProd = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const product = await RadonarProd.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    const updatableFields: (keyof IRadonarProd)[] = [
      "name",
      "description",
      "tags",
      "category",
      "brand",
      "price",
      "stock",
      "stockThreshold",
      "frameMaterial",
      "brakeType",
      "wheelSize",
      "gearCount",
      "suspensionType",
      "color",
      "weightKg",
      "isElectric",
      "batteryRangeKm",
      "motorPowerW",
      "isPublished",
    ];

    updatableFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (product as any)[field] = parseIfJson(updates[field]);
      }
    });

    if (!Array.isArray(product.images)) product.images = [];

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

        product.images.push({
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
        product.images = product.images.filter(
          (img: any) => !removed.includes(img.url)
        );

        for (const img of removed) {
          const localPath = path.join(
            "uploads",
            "radonarprod-images",
            path.basename(img.url)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
        }
      } catch (e) {
        console.warn("Invalid removedImages JSON:", e);
      }
    }

    await product.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Product updated successfully.",
        data: product,
      });
  }
);

// ✅ DELETE
export const deleteRadonarProd = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const product = await RadonarProd.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    for (const img of product.images) {
      const localPath = path.join(
        "uploads",
        "radonarprod-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
    }

    await product.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully." });
  }
);

// ✅ GET ALL
export const adminGetAllRadonarProd = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await RadonarProd.find()
      .populate("comments")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .lean();

    res
      .status(200)
      .json({
        success: true,
        message: "Product list fetched successfully.",
        data: products,
      });
  }
);

// ✅ GET BY ID
export const adminGetRadonarProdById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const product = await RadonarProd.findById(id)
      .populate("comments")
      .populate("category", "name")
      .lean();

    if (!product || !product.isActive) {
      res
        .status(404)
        .json({ success: false, message: "Product not found or inactive." });
      return;
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Product fetched successfully.",
        data: product,
      });
  }
);
