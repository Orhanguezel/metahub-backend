import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { Category } from "@/modules/category";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get All Categories
export const getAllCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { isActive } = req.query;
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const categories = await Category.find(filter).sort({ name: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully.",
      data: categories,
    });

    return;
  }
);

// ✅ Get Category By ID
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
      return;
    }

    const category = await Category.findById(id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Category fetched successfully.",
      data: category,
    });

    return;
  }
);
