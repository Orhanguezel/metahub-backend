import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {ForumCategory} from "../forum";

// ➕ Create new category
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name?.en) {
    res.status(400).json({
      success: false,
      message: "Category name (English) is required.",
    });
    return;
  }

  const category = await ForumCategory.create({ name, description });

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    data: category,
  });
});

// 📄 Get all categories
export const getAllCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await ForumCategory.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Categories fetched successfully.",
    data: categories,
  });
});
