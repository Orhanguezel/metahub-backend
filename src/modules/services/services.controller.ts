// src/controllers/services.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Service } from "@/modules/services";
import { BASE_URL } from "@/core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Service
export const createService = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    shortDescription,
    detailedDescription,
    price,
    durationMinutes,
    category,
    tags = [],
    isPublished = false,
  } = req.body;

  const images = Array.isArray(req.files)
    ? req.files.map((file: Express.Multer.File) => `${BASE_URL}/uploads/service-images/${file.filename}`)
    : [];

  const service = await Service.create({
    title,
    shortDescription,
    detailedDescription,
    price,
    durationMinutes,
    category,
    tags: typeof tags === "string" ? JSON.parse(tags) : tags,
    isPublished,
    images,
  });

  res.status(201).json({
    success: true,
    message: "Service created successfully.",
    data: service,
  });
});

// ✅ Get All Services
export const getAllServices = asyncHandler(async (_req: Request, res: Response) => {
  const services = await Service.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Services fetched successfully.",
    data: services,
  });
});

// ✅ Get Single Service
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid service ID." });
    return;
  }

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ success: false, message: "Service not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Service fetched successfully.",
    data: service,
  });
});

// ✅ Update Service
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid service ID." });
    return;
  }

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ success: false, message: "Service not found." });
    return;
  }

  const updates = req.body;
  Object.assign(service, updates);

  if (updates.tags) {
    try {
      service.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {
      // silently fail if invalid JSON, no crash
    }
  }

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map((file) => `${BASE_URL}/uploads/service-images/${file.filename}`) || [];
  if (newImages.length > 0) {
    service.images = [...service.images, ...newImages];
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      service.images = service.images.filter((img) => !removed.includes(img));
      removed.forEach((imgUrl: string) => {
        const localPath = path.join("uploads", "service-images", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {
      // fail silently
    }
  }

  await service.save();

  res.status(200).json({
    success: true,
    message: "Service updated successfully.",
    data: service,
  });
});

// ✅ Delete Service
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid service ID." });
    return;
  }

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ success: false, message: "Service not found." });
    return;
  }

  // Delete images from disk
  service.images.forEach((imgPath) => {
    const localPath = path.join("uploads", "service-images", path.basename(imgPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  await service.deleteOne();

  res.status(200).json({
    success: true,
    message: "Service deleted successfully.",
  });
});
