import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {AboutCategory} from "."; 
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create About Category
export const createAboutCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return;
  }

  const newCategory = await AboutCategory.create({ name, description });

  res.status(201).json({
    success: true,
    message: "About category created successfully.",
    data: newCategory,
  });
});

// ✅ Get All About Categories
export const getAllAboutCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await AboutCategory.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "About categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get About Category by ID
export const getAboutCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await AboutCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "About category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "About category fetched successfully.",
    data: category,
  });
});

// ✅ Update About Category
export const updateAboutCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await AboutCategory.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: "About category not found." });
    return;
  }

  const { name, description, isActive } = req.body;

  if (name) category.name = name;
  if (typeof isActive === "boolean") category.isActive = isActive;
  if (description !== undefined) category.description = description;

  await category.save();

  res.status(200).json({
    success: true,
    message: "About category updated successfully.",
    data: category,
  });
});

// ✅ Delete About Category
export const deleteAboutCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await AboutCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "About category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "About category deleted successfully.",
  });
});
