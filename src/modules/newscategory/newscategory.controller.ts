import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import NewsCategory from "./newscategory.models";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create News Category
export const createNewsCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name in all languages is required." });
    return;
  }

  const category = await NewsCategory.create({
    name,
    slug: name.en
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, ""),
  });

  res.status(201).json({
    success: true,
    message: "News category created successfully.",
    data: category,
  });
});

// ✅ Get All News Categories
export const getAllNewsCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await NewsCategory.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "News categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get Single News Category
export const getNewsCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await NewsCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "News category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "News category fetched successfully.",
    data: category,
  });
});

// ✅ Update News Category
export const updateNewsCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await NewsCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "News category not found." });
    return;
  }

  if (name?.tr) category.name.tr = name.tr;
  if (name?.en) category.name.en = name.en;
  if (name?.de) category.name.de = name.de;

  if (typeof isActive === "boolean") {
    category.isActive = isActive;
  }

  if (name?.en) {
    category.slug = name.en
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  await category.save();

  res.status(200).json({
    success: true,
    message: "News category updated successfully.",
    data: category,
  });
});

// ✅ Delete News Category
export const deleteNewsCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await NewsCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "News category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "News category deleted successfully.",
  });
});
