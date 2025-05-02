import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { BlogCategory } from "../blogcategory"; 
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Blog Category
export const createBlogCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return;
  }

  const blogCategory = await BlogCategory.create({
    name,
    description,
  });

  res.status(201).json({
    success: true,
    message: "Blog category created successfully.",
    data: blogCategory,
  });

  return;
});

// ✅ Get All Blog Categories
export const getAllBlogCategories = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  const categories = await BlogCategory.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: categories,
  });

  return;
});

// ✅ Get Blog Category by ID
export const getBlogCategoryById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    data: category,
  });

  return;
});

// ✅ Update Blog Category
export const updateBlogCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await BlogCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Blog category not found." });
    return;
  }

  category.name = updates.name ?? category.name;
  category.description = updates.description ?? category.description;
  category.isActive = typeof updates.isActive === "boolean" ? updates.isActive : category.isActive;

  await category.save();

  res.status(200).json({
    success: true,
    message: "Blog category updated successfully.",
    data: category,
  });

  return;
});

// ✅ Delete Blog Category
export const deleteBlogCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

  return;
});
