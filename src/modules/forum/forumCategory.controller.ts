import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumCategory from "./forumCategory.models";

// ➕ Yeni kategori
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const language = req.locale || "en";

  if (!name) {
    res.status(400).json({ message: "Category name is required." });
    return;
  }

  const category = await ForumCategory.create({ name, description, language });
  res.status(201).json(category);
});

// 📄 Tüm kategorileri getir
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.locale || "en";
  const categories = await ForumCategory.find({ language: lang }).sort({ createdAt: -1 });
  res.status(200).json(categories);
});
