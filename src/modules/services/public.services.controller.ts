import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Services } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Public - Get all services (optional: filter by category, language)
export const getAllServices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

  const servicesList = await Services.find(filter)
    .populate("category", "title")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Services list fetched successfully.",
    data: servicesList,
  });
});

// ✅ Public - Get service by ID
export const getServicesById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid service ID." });
    return;
  }

  const services = await Services.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "title")
    .lean();

  if (!services) {
    res.status(404).json({ success: false, message: "Service not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Service fetched successfully.",
    data: services,
  });
});

// ✅ Public - Get service by Slug
export const getServicesBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const services = await Services.findOne({
    slug,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "title")
    .lean();

  if (!services) {
    res.status(404).json({ success: false, message: "Service not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Service fetched successfully.",
    data: services,
  });
});
