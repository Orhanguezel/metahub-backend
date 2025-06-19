import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Activity Category
export const createActivityCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body;
    const { ActivityCategory } = await getTenantModels(req);

    if (!name?.tr || !name?.en || !name?.de) {
      res
        .status(400)
        .json({ success: false, message: "Name (tr, en, de) is required." });
      return;
    }

    const newCategory = await ActivityCategory.create({
      name,
      description,
      tenant: req.tenant,
    });

    res.status(201).json({
      success: true,
      message: "Activity category created successfully.",
      data: newCategory,
    });
  }
);

// ✅ Get All Activity Categories
export const getAllActivityCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ActivityCategory } = await getTenantModels(req);
    const categories = await ActivityCategory.findOne({
      tenant: req.tenant,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Activity categories fetched successfully.",
      data: categories,
    });
  }
);

// ✅ Get Activity Category by ID
export const getActivityCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { ActivityCategory } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await ActivityCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Activity category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Activity category fetched successfully.",
      data: category,
    });
  }
);

// ✅ Update Activity Category
export const updateActivityCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { ActivityCategory } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await ActivityCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Activity category not found." });
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
  }
);

// ✅ Delete Activity Category
export const deleteActivityCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { ActivityCategory } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const deleted = await ActivityCategory.deleteOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      res
        .status(404)
        .json({ success: false, message: "Activity category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Activity category deleted successfully.",
    });
  }
);
