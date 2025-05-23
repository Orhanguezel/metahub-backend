// src/modules/referencescategory/admin.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ReferenceCategory } from "@/modules/referencescategory";
import { isValidObjectId } from "@/core/utils/validation";

// CREATE
export const createReferenceCategory = asyncHandler(async (req: Request, res: Response) => {
  let { name, description } = req.body;
  if (typeof name === "string") name = JSON.parse(name);
  if (typeof description === "string") description = JSON.parse(description);

  if (!name?.tr || !name?.en || !name?.de) {
    res.status(400).json({ success: false, message: "Name (tr, en, de) is required." });
    return 
  }

  const newCategory = await ReferenceCategory.create({ name, description });
  res.status(201).json({
    success: true,
    message: "Reference category created successfully.",
    data: newCategory,
  });
});

// GET ALL
export const getAllReferenceCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await ReferenceCategory.find({}).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Reference categories fetched successfully.",
    data: categories,
  });
});

// GET BY ID
export const getReferenceCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid category ID." });
     return
  }
  const category = await ReferenceCategory.findById(id);
  if (!category) {
     res.status(404).json({ success: false, message: "Reference category not found." });
     return
  }
  res.status(200).json({
    success: true,
    message: "Reference category fetched successfully.",
    data: category,
  });
});

// UPDATE
export const updateReferenceCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid category ID." });
     return
  }
  const category = await ReferenceCategory.findById(id);
  if (!category) {
     res.status(404).json({ success: false, message: "Reference category not found." });
     return
  }
  let { name, description, isActive } = req.body;
  if (name) {
    if (typeof name === "string") name = JSON.parse(name);
    category.name = name;
  }
  if (description) {
    if (typeof description === "string") description = JSON.parse(description);
    category.description = description;
  }
  if (typeof isActive === "boolean") category.isActive = isActive;

  await category.save();
  res.status(200).json({
    success: true,
    message: "Reference category updated successfully.",
    data: category,
  });
});

// DELETE
export const deleteReferenceCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
     res.status(400).json({ success: false, message: "Invalid category ID." });
     return
  }
  const deleted = await ReferenceCategory.findByIdAndDelete(id);
  if (!deleted) {
     res.status(404).json({ success: false, message: "Reference category not found." });
     return
  }
  res.status(200).json({
    success: true,
    message: "Reference category deleted successfully.",
  });
});
