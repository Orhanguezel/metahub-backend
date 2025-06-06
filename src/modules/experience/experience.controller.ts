import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { Experience } from "@/modules/experience";

// 🔹 Get all experiences (optional lang filter)
export const getAllExperiences = asyncHandler(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || req.locale || "en";

  const experiences = await Experience.find({
    [`position.${lang}`]: { $exists: true },
    [`company.${lang}`]: { $exists: true },
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: experiences,
  });
});

// 🔹 Get single experience by ID
export const getExperienceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid experience ID." });
    return;
  }

  const experience = await Experience.findById(id);
  if (!experience) {
    res.status(404).json({ success: false, message: "Experience not found." });
    return;
  }

  res.status(200).json({
    success: true,
    data: experience,
  });
});

// ➕ Create experience
export const createExperience = asyncHandler(async (req: Request, res: Response) => {
  const { position, company, period, description, location, image } = req.body;

  const newExperience = await Experience.create({
    position,
    company,
    period,
    description,
    location,
    image,
  });

  res.status(201).json({
    success: true,
    message: "Experience created successfully.",
    data: newExperience,
  });
});

// ✏️ Update experience
export const updateExperience = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid experience ID." });
    return;
  }

  const experience = await Experience.findByIdAndUpdate(id, updates, { new: true });
  if (!experience) {
    res.status(404).json({ success: false, message: "Experience not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Experience updated successfully.",
    data: experience,
  });
});

// 🗑️ Delete experience
export const deleteExperience = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid experience ID." });
    return;
  }

  const experience = await Experience.findByIdAndDelete(id);
  if (!experience) {
    res.status(404).json({ success: false, message: "Experience not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Experience deleted successfully.",
  });
});
