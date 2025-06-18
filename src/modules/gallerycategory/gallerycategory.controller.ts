import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { GalleryCategory } from ".";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Gallery Category
export const createGalleryCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { GalleryCategory } = await getTenantModels(req);
    const { name, description } = req.body;

    if (!name?.tr || !name?.en || !name?.de) {
      res
        .status(400)
        .json({ success: false, message: "Name (tr, en, de) is required." });
      return;
    }

    const newCategory = await GalleryCategory.create({
      name,
      description,
      tenant: req.tenant,
    });

    res.status(201).json({
      success: true,
      message: "Gallery category created successfully.",
      data: newCategory,
    });
  }
);

// ✅ Get All Gallery Categories
export const getAllGalleryCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { GalleryCategory } = await getTenantModels(req);
    const categories = await GalleryCategory.find({ tenant: req.tenant }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Gallery categories fetched successfully.",
      data: categories,
    });
  }
);

// ✅ Get Gallery Category by ID
export const getGalleryCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { GalleryCategory } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await GalleryCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Gallery category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Gallery category fetched successfully.",
      data: category,
    });
  }
);

// ✅ Update Gallery Category
export const updateGalleryCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { GalleryCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await GalleryCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });
    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Gallery category not found." });
      return;
    }

    const { name, description, isActive } = req.body;

    if (name) category.name = name;
    if (typeof isActive === "boolean") category.isActive = isActive;
    if (description !== undefined) category.description = description;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Gallery category updated successfully.",
      data: category,
    });
  }
);

// ✅ Delete Gallery Category
export const deleteGalleryCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { GalleryCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const deleted = await GalleryCategory.deleteOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      res
        .status(404)
        .json({ success: false, message: "Gallery category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Gallery category deleted successfully.",
    });
  }
);
