import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {ServicesCategory} from "@/modules/servicescategory"; 
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Services Category
export const createServicesCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return;
  }

  const newCategory = await ServicesCategory.create({ name, description });

  res.status(201).json({
    success: true,
    message: "Services category created successfully.",
    data: newCategory,
  });
});

// ✅ Get All Services Categories
export const getAllServicesCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await ServicesCategory.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Services categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get Services Category by ID
export const getServicesCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ServicesCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Services category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Services category fetched successfully.",
    data: category,
  });
});

// ✅ Update Services Category
export const updateServicesCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ServicesCategory.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: "Services category not found." });
    return;
  }

  const { name, description, isActive } = req.body;

  if (name) category.name = name;
  if (typeof isActive === "boolean") category.isActive = isActive;
  if (description !== undefined) category.description = description;

  await category.save();

  res.status(200).json({
    success: true,
    message: "Services category updated successfully.",
    data: category,
  });
});

// ✅ Delete Services Category
export const deleteServicesCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await ServicesCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Services category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Services category deleted successfully.",
  });
});
