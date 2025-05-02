import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Product } from "@/modules/product";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import { Stockmovement } from "@/modules/stockmovement";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// Optimize Image
const optimizeImage = async (filePath: string): Promise<string> => {
  const outputPath = filePath.replace(/(\.[\w\d_-]+)$/i, "-optimized$1");

  await sharp(filePath)
    .resize({ width: 800 })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  fs.unlinkSync(filePath);

  return outputPath.replace("uploads/", `${BASE_URL}/${UPLOAD_BASE_PATH}/`);
};

// Create Product
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, price, category, tags = [], stock, stockThreshold } = req.body;

    const images = req.files as Express.Multer.File[];
    const imageUrls = images
      ? await Promise.all(images.map(async (file) => await optimizeImage(file.path)))
      : [];

    const product = await Product.create({
      name,
      description,
      price,
      category,
      images: imageUrls,
      tags,
      stock,
      stockThreshold: stockThreshold ?? 5,
    });

    await Stockmovement.create({
      product: product._id,
      type: "increase",
      quantity: stock,
      note: "Product created with initial stock.",
      createdBy: req.user?._id || null,
    });

    res.status(201).json({
      message: "Product created successfully.",
      product,
    });

    return;
  } catch (error) {
    next(error);
  }
});

// Update Product
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        message: "Product not found.",
      });
      return;
    }

    const oldStock = product.stock;

    product.name = updates.name ?? product.name;
    product.description = updates.description ?? product.description;
    product.price = updates.price ?? product.price;
    product.category = updates.category ?? product.category;
    product.stockThreshold = updates.stockThreshold ?? product.stockThreshold;
    product.isActive = typeof updates.isActive !== "undefined" ? updates.isActive === "true" : product.isActive;
    product.isPublished = typeof updates.isPublished !== "undefined" ? updates.isPublished === "true" : product.isPublished;

    if (updates.tags) {
      try {
        product.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
      } catch {}
    }

    if (updates.stock !== undefined && updates.stock !== oldStock) {
      const diff = Number(updates.stock) - Number(oldStock);
      const movementType = diff > 0 ? "increase" : "decrease";

      product.stock = Number(updates.stock);

      await Stockmovement.create({
        product: product._id,
        type: movementType,
        quantity: Math.abs(diff),
        note: "Stock manually updated.",
        createdBy: req.user?._id || null,
      });
    }

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const newImages = await Promise.all(files.map(async (file) => await optimizeImage(file.path)));
      product.images = [...product.images, ...newImages];
    }

    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        product.images = product.images.filter((img: string) => !removed.includes(img));

        removed.forEach((imgUrl: string) => {
          const relativePath = imgUrl.replace(`${BASE_URL}/`, "");
          const fullPath = path.join("uploads", relativePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      } catch {}
    }

    await product.save();

    res.status(200).json({
      message: "Product updated successfully.",
      product,
    });

    return;
  } catch (error) {
    next(error);
  }
});

// Delete Product
export const deleteProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        message: "Product not found or already deleted.",
      });
      return;
    }

    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((imgUrl) => {
        const relativePath = imgUrl.replace(`${BASE_URL}/`, "");
        const fullPath = path.join("uploads", relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await Stockmovement.deleteMany({ product: product._id });
    await product.deleteOne();

    res.status(200).json({
      message: "Product deleted successfully.",
    });

    return;
  } catch (error) {
    next(error);
  }
});

// Toggle Publish Status
export const togglePublishStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({
        message: "Product not found.",
      });
      return;
    }

    product.isPublished = !product.isPublished;
    await product.save();

    res.status(200).json({
      message: product.isPublished ? "Product published." : "Product unpublished.",
      isPublished: product.isPublished,
      _id: product._id,
    });

    return;
  } catch (error) {
    next(error);
  }
});
