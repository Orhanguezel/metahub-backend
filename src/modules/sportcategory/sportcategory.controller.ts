import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { SportCategory } from ".";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Sport Category
export const createSportCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { SportCategory } = await getTenantModels(req);
    const { name } = req.body;

    if (!name?.tr || !name?.en || !name?.de) {
      res.status(400).json({
        success: false,
        message: "Name in all languages is required.",
      });
      return;
    }

    const category = await SportCategory.create({
      name,
      tenant: req.tenant,
      slug: name.en
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, ""),
    });

    res.status(201).json({
      success: true,
      message: "Sport category created successfully.",
      data: category,
    });
  }
);

// ✅ Get All Sport Categories
export const getAllSportCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { SportCategory } = await getTenantModels(req);
    const categories = await SportCategory.find({ tenant: req.tenant }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Sport categories fetched successfully.",
      data: categories,
    });
  }
);

// ✅ Get Single Sport Category
export const getSportCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { SportCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await SportCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Sport category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Sport category fetched successfully.",
      data: category,
    });
  }
);

// ✅ Update Sport Category
export const updateSportCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { SportCategory } = await getTenantModels(req);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await SportCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Sport category not found." });
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
      message: "Sport category updated successfully.",
      data: category,
    });
  }
);

// ✅ Delete Sport Category
export const deleteSportCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { SportCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const deleted = await SportCategory.deleteOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      res
        .status(404)
        .json({ success: false, message: "Sport category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Sport category deleted successfully.",
    });
  }
);
