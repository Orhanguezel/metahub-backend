import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {BlogCategory} from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Blog Category
export const createBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name in all languages is required." });
    return;
  }

  const category = await BlogCategory.create({
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
    message: "Blog category created successfully.",
    data: category,
  });
});

// ✅ Get All Blog Categories
export const getAllBlogCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await BlogCategory.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Blog categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get Single Blog Category
export const getBlogCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await BlogCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Blog category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Blog category fetched successfully.",
    data: category,
  });
});

// ✅ Update Blog Category
export const updateBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await BlogCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Blog category not found." });
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
    message: "Blog category updated successfully.",
    data: category,
  });
});

// ✅ Delete Blog Category
export const deleteBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await BlogCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Blog category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Blog category deleted successfully.",
  });
});
