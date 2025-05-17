import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {ActivityCategory} from "."; 
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Activity Category
export const createActivityCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return;
  }

  const newCategory = await ActivityCategory.create({ name, description });

  res.status(201).json({
    success: true,
    message: "Activity category created successfully.",
    data: newCategory,
  });
});

// ✅ Get All Activity Categories
export const getAllActivityCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await ActivityCategory.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Activity categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get Activity Category by ID
export const getActivityCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ActivityCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Activity category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Activity category fetched successfully.",
    data: category,
  });
});

// ✅ Update Activity Category
export const updateActivityCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ActivityCategory.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: "Activity category not found." });
    return;
  }

  const { name, description, isActive } = req.body;

  if (name) category.name = name;
  if (typeof isActive === "boolean") category.isActive = isActive;
  if (description !== undefined) category.description = description;

  await category.save();

  res.status(200).json({
    success: true,
    message: "Activity category updated successfully.",
    data: category,
  });
});

// ✅ Delete Activity Category
export const deleteActivityCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await ActivityCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Activity category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Activity category deleted successfully.",
  });
});
