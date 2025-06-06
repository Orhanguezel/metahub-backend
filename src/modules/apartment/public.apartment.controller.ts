import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Apartment } from ".";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Public - Get All Apartments
export const getAllApartments = asyncHandler(async (req: Request, res: Response) => {
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

  const apartments = await Apartment.find(filter)
    .populate("category", "title")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    message: "Apartment list fetched successfully.",
    data: apartments,
  });
});

// ✅ Public - Get Apartment by ID
export const getApartmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid Apartment ID." });
    return;
  }

  const apartment = await Apartment.findOne({
    _id: id,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "title")
    .lean();

  if (!apartment) {
    res.status(404).json({ success: false, message: "Apartment not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Apartment fetched successfully.",
    data: apartment,
  });
});

// ✅ Public - Get Apartment by Slug
export const getApartmentBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const apartment = await Apartment.findOne({
    slug,
    isActive: true,
    isPublished: true,
  })
    .populate("category", "title")
    .lean();

  if (!apartment) {
    res.status(404).json({ success: false, message: "Apartment not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Apartment fetched successfully.",
    data: apartment,
  });
});
