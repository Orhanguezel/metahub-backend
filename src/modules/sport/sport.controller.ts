import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Sport } from "@/modules/sport";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// ➕ Create sport
export const createSport = asyncHandler(async (req: Request, res: Response) => {
  const { label, description, category } = req.body;

  const files = req.files as Express.Multer.File[];
  const images = files?.map(file =>
    `${BASE_URL}/${UPLOAD_BASE_PATH}/sport/${file.filename}`
  ) || [];

  const sport = await Sport.create({
    label,
    description,
    category,
    images,
  });

  res.status(201).json({
    success: true,
    message: "Sport created successfully.",
    data: sport,
  });
});

// 📄 Get all sports
export const getAllSports = asyncHandler(async (_req: Request, res: Response) => {
  const sports = await Sport.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "All sports fetched successfully.",
    data: sports,
  });
});

// 🔍 Get sport by ID
export const getSportById = asyncHandler(async (req: Request, res: Response) => {
  const sport = await Sport.findById(req.params.id);
  if (!sport) {
    res.status(404);
    throw new Error("Sport not found.");
  }
  res.status(200).json({
    success: true,
    message: "Sport fetched successfully.",
    data: sport,
  });
});

// ✏️ Update sport
export const updateSport = asyncHandler(async (req: Request, res: Response) => {
  const sport = await Sport.findById(req.params.id);
  if (!sport) {
    res.status(404);
    throw new Error("Sport not found.");
  }

  const { label, description, category, removedImages } = req.body;

  if (label) sport.label = label;
  if (description) sport.description = description;
  if (category) sport.category = category;

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file =>
    `${BASE_URL}/${UPLOAD_BASE_PATH}/sport/${file.filename}`
  ) || [];

  if (newImages.length > 0) {
    sport.images = [...sport.images, ...newImages];
  }

  if (removedImages) {
    try {
      const toRemove: string[] = JSON.parse(removedImages);
      sport.images = sport.images.filter(img => !toRemove.includes(img));

      toRemove.forEach(imgUrl => {
        const localPath = path.join("uploads", "sport", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {}
  }

  await sport.save();

  res.status(200).json({
    success: true,
    message: "Sport updated successfully.",
    data: sport,
  });
});

// 🗑️ Delete sport
export const deleteSport = asyncHandler(async (req: Request, res: Response) => {
  const sport = await Sport.findByIdAndDelete(req.params.id);
  if (!sport) {
    res.status(404);
    throw new Error("Sport not found or already deleted.");
  }

  sport.images?.forEach(imgUrl => {
    const localPath = path.join("uploads", "sport", path.basename(imgUrl));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  res.status(200).json({
    success: true,
    message: "Sport deleted successfully.",
  });
});
