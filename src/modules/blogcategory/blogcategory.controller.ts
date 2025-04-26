import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import BlogCategory from "./blogcategory.models";
import { isValidObjectId } from "@/core/utils/validation";

export const createBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ message: "Name (tr, en, de) is required." });
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
});


export const getAllBlogCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await BlogCategory.find({}).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: categories,
  });
});


export const getBlogCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid category ID." });
    return;
  }

  const category = await BlogCategory.findById(id);

  if (!category) {
    res.status(404).json({ message: "Blog category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});


export const updateBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid category ID." });
    return;
  }

  const category = await BlogCategory.findById(id);

  if (!category) {
    res.status(404).json({ message: "Blog category not found." });
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
});

export const deleteBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid category ID." });
    return;
  }

  const deleted = await BlogCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ message: "Blog category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Blog category deleted successfully.",
  });
});
