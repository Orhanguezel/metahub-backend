import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { EnsotekProd } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Published Ensotek Products (Public)
export const getAllEnsotekProd = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const filter: Record<string, any> = { isActive: true, isPublished: true };

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  if (language && typeof language === "string" && ["tr", "en", "de"].includes(language)) {
    filter[`name.${language}`] = { $exists: true };
  }

  const products = await EnsotekProd.find(filter)
    .populate("comments")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Product list fetched successfully.",
    data: products,
  });
});

// ✅ Get Product by ID (Public)
export const getEnsotekProdById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid product ID." });
    return;
  }

  const product = await EnsotekProd.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name")
    .lean();

  if (!product) {
    res.status(404).json({ success: false, message: "Product not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Product fetched successfully.",
    data: product,
  });
});

// ✅ Get Product by Slug (Public)
export const getEnsotekProdBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const product = await EnsotekProd.findOne({
    slug,
    isActive: true,
    isPublished: true,
  })
    .populate("comments")
    .populate("category", "name")
    .lean();

  if (!product) {
    res.status(404).json({ success: false, message: "Product not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Product fetched successfully.",
    data: product,
  });
});
