import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { EnsotekCategory } from "@/modules/ensotekcategory";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Ensotek Category
export const createEnsotekCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;

    if (!name?.tr || !name?.en || !name?.de) {
      res.status(400).json({
        success: false,
        message: "Name in all languages is required.",
      });
      return;
    }

    const { EnsotekCategory } = await getTenantModels(req);
    const category = await EnsotekCategory.create({
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
      message: "Ensotek category created successfully.",
      data: category,
    });
  }
);

// ✅ Get All Ensotek Categories
export const getAllEnsotekCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EnsotekCategory } = await getTenantModels(req);
    const categories = await EnsotekCategory.find({ tenant: req.tenant }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Ensotek categories fetched successfully.",
      data: categories,
    });
  }
);

// ✅ Get Single Ensotek Category
export const getEnsotekCategoryById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EnsotekCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await EnsotekCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Ensotek category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Ensotek category fetched successfully.",
      data: category,
    });
  }
);

// ✅ Update Ensotek Category
export const updateEnsotekCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EnsotekCategory } = await getTenantModels(req);
    const { id } = req.params;
    const { name, isActive } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const category = await EnsotekCategory.findOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!category) {
      res
        .status(404)
        .json({ success: false, message: "Ensotek category not found." });
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
      message: "Ensotek category updated successfully.",
      data: category,
    });
  }
);

// ✅ Delete Ensotek Category
export const deleteEnsotekCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EnsotekCategory } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid category ID." });
      return;
    }

    const deleted = await EnsotekCategory.deleteOne({
      _id: id,
      tenant: req.tenant,
    });

    if (!deleted) {
      res
        .status(404)
        .json({ success: false, message: "Ensotek category not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Ensotek category deleted successfully.",
    });
  }
);
