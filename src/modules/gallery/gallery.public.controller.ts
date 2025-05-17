import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Gallery } from "../gallery";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get published gallery items
export const getPublishedGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { page = "1", limit = "10", category } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const filters: any = { isPublished: true, isActive: true };
  if (category) filters.category = category;

  const [items, total] = await Promise.all([
    Gallery.find(filters).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Gallery.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    message: "Published gallery items fetched successfully.",
    data: items,
    pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
  });
});

// ✅ Get published gallery items by category
export const getPublishedGalleryItemsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;

  if (!category) {
    res.status(400).json({ success: false, message: "Category parameter is required." });
    return;
  }

  const items = await Gallery.find({
    category,
    isPublished: true,
    isActive: true,
  }).sort({ priority: -1, createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    message: "Published gallery items by category fetched successfully.",
    data: items,
  });
});

// ✅ Get gallery categories
export const getGalleryCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Gallery.distinct("category");

  res.status(200).json({
    success: true,
    message: "Gallery categories fetched successfully.",
    data: categories,
  });
});

// ✅ Search + filter
export const searchGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { search, isPublished, isActive, category, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const filters: any = {};
  if (category) filters.category = category;
  if (typeof isPublished !== "undefined") filters.isPublished = isPublished === "true";
  if (typeof isActive !== "undefined") filters.isActive = isActive === "true";

  if (search) {
    const [field, value] = (search as string).split(":");
    filters[field] = { $regex: value, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Gallery.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Gallery.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    message: "Filtered gallery items fetched successfully.",
    data: items,
    pagination: {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ✅ Dashboard stats
export const getGalleryStats = asyncHandler(async (_req: Request, res: Response) => {
  const [total, published, active, categories] = await Promise.all([
    Gallery.countDocuments(),
    Gallery.countDocuments({ isPublished: true }),
    Gallery.countDocuments({ isActive: true }),
    Gallery.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    success: true,
    message: "Gallery stats fetched successfully.",
    data: {
      total,
      published,
      active,
      categories: categories.reduce((acc, cur) => {
        acc[cur._id] = cur.count;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// ✅ Get gallery item by ID
export const getGalleryItemById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findById(id).lean();

  if (!item) {
    res.status(404).json({ success: false, message: "Gallery item not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Gallery item fetched successfully.",
    data: item,
  });
});
