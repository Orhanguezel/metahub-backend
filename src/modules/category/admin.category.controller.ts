import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { Category } from "@/modules/category";
import slugify from "slugify";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Category
export const createCategory = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { name, description, isActive, label, parentCategory } = req.body;
    const { BASE_URL, UPLOAD_BASE_PATH } = process.env;

    const files = req.files as Express.Multer.File[];
    const previewImage = files?.[0]?.filename || null;
    const imageUrl = previewImage
      ? `${BASE_URL}/${UPLOAD_BASE_PATH}/category-images/${previewImage}`
      : "defaults/category.png";

    if (!name || !label?.tr || !label?.en || !label?.de) {
      res.status(400).json({
        success: false,
        message: "Please fill all required fields (name, labels).",
      });
      return;
    }

    const slug = slugify(name, { lower: true });
    const existing = await Category.findOne({ slug });

    if (existing) {
      res.status(409).json({
        success: false,
        message: "Category already exists.",
      });
      return;
    }

    const category = await Category.create({
      name,
      slug,
      description,
      isActive: typeof isActive === "boolean" ? isActive : true,
      image: imageUrl,
      label,
      parentCategory: parentCategory || undefined,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
    return;
  }
);

// ✅ Update Category
export const updateCategory = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { name, description, isActive, label, parentCategory } = req.body;
    const { BASE_URL, UPLOAD_BASE_PATH } = process.env;
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

    category.name = name ?? category.name;
    category.description = description ?? category.description;
    category.isActive =
      typeof isActive === "boolean" ? isActive : category.isActive;
    category.slug = name ? slugify(name, { lower: true }) : category.slug;
    category.parentCategory = parentCategory || undefined;

    if (label) {
      category.label = label;
    }

    const file = req.file as Express.Multer.File;
    if (file) {
      category.image = `${BASE_URL}/${UPLOAD_BASE_PATH}/category-images/${file.filename}`;
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: category,
    });
    return;
  }
);

// ✅ Delete Category
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
      return;
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
    return;
  }
);
