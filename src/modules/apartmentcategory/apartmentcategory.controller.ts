import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {ApartmentCategory} from "."; 
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create apartment Category
export const createApartmentCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return;
  }

  const newCategory = await ApartmentCategory.create({ name, description });

  res.status(201).json({
    success: true,
    message: "apartment category created successfully.",
    data: newCategory,
  });
});

// ✅ Get All apartment Categories
export const getAllApartmentCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await ApartmentCategory.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "apartment categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get apartment Category by ID
export const getApartmentCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ApartmentCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "apartment category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "apartment category fetched successfully.",
    data: category,
  });
});

// ✅ Update apartment Category
export const updateApartmentCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await ApartmentCategory.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: "apartment category not found." });
    return;
  }

  const { name, description, isActive } = req.body;

  if (name) category.name = name;
  if (typeof isActive === "boolean") category.isActive = isActive;
  if (description !== undefined) category.description = description;

  await category.save();

  res.status(200).json({
    success: true,
    message: "apartment category updated successfully.",
    data: category,
  });
});

// ✅ Delete apartment Category
export const deleteApartmentCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await ApartmentCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "apartment category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "apartment category deleted successfully.",
  });
});
