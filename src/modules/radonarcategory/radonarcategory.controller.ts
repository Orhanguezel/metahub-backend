import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {RadonarCategory} from "@/modules/radonarcategory";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Radonar Category
export const createRadonarCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name in all languages is required." });
    return;
  }

  const category = await RadonarCategory.create({
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
    message: "Radonar category created successfully.",
    data: category,
  });
});

// ✅ Get All Radonar Categories
export const getAllRadonarCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const categories = await RadonarCategory.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Radonar categories fetched successfully.",
    data: categories,
  });
});

// ✅ Get Single Radonar Category
export const getRadonarCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await RadonarCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Radonar category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Radonar category fetched successfully.",
    data: category,
  });
});

// ✅ Update Radonar Category
export const updateRadonarCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const category = await RadonarCategory.findById(id);

  if (!category) {
    res.status(404).json({ success: false, message: "Radonar category not found." });
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
    message: "Radonar category updated successfully.",
    data: category,
  });
});

// ✅ Delete Radonar Category
export const deleteRadonarCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid category ID." });
    return;
  }

  const deleted = await RadonarCategory.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({ success: false, message: "Radonar category not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Radonar category deleted successfully.",
  });
});
