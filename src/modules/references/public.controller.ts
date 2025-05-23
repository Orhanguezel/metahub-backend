import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Reference } from "@/modules/references/models";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Public - Get all references (optional: filter by category, language)
export const getAllReferences = asyncHandler(async (req: Request, res: Response) => {
  const { category, language } = req.query;
  const filter: Record<string, any> = {
    isActive: true,
    isPublished: true,
  };

  if (category && isValidObjectId(category.toString())) {
    filter.category = category;
  }

  if (typeof language === "string" && ["tr", "en", "de"].includes(language)) {
    filter[`title.${language}`] = { $exists: true };
  }

  const referenceList = await Reference.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Reference list fetched successfully.",
    data: referenceList,
  });
});

// ✅ Public - Get reference by ID
export const getReferenceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid reference ID." });
    return;
  }

  const reference = await Reference.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "name")
    .lean();

  if (!reference) {
    res.status(404).json({ success: false, message: "Reference not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Reference fetched successfully.",
    data: reference,
  });
});

// ✅ Public - Get reference by Slug
export const getReferenceBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const reference = await Reference.findOne({
    slug,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "name")
    .lean();

  if (!reference) {
    res.status(404).json({ success: false, message: "Reference not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Reference fetched successfully.",
    data: reference,
  });
});
