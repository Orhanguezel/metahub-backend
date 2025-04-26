import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { Category } from "./category.models";
import { isValidObjectId } from "@/core/utils/validation";

export const getAllCategories = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isActive } = req.query;
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const categories = await Category.find(filter).sort({ name: 1, createdAt: -1 });
    res.status(200).json(categories);
    return;
  } catch (error) {
    next(error);
  }
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid category ID." });
      return;
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    res.status(200).json(category);
    return;
  } catch (error) {
    next(error);
  }
});
