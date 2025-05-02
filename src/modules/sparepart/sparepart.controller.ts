import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { SparePart } from "@/modules/sparepart";
import fs from "fs";
import path from "path";
import { BASE_URL } from "@/core/middleware/uploadMiddleware";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Spare Part
export const createSparePart = asyncHandler(async (req: Request, res: Response) => {
  const {
    label,
    slug,
    code,
    description,
    category,
    manufacturer,
    specifications = {},
    stock = 0,
    price,
    tags = [],
    isPublished = false,
  } = req.body;

  const images = Array.isArray(req.files)
    ? req.files.map((file: Express.Multer.File) => `${BASE_URL}/uploads/spareparts/${file.filename}`)
    : [];

  const sparePart = await SparePart.create({
    label,
    slug,
    code,
    description,
    category,
    manufacturer,
    specifications,
    stock,
    price,
    tags: typeof tags === "string" ? JSON.parse(tags) : tags,
    isPublished,
    image: images,
  });

  res.status(201).json({
    success: true,
    message: "Spare part created successfully.",
    data: sparePart,
  });
});

// ✅ Get All Spare Parts
export const getAllSpareParts = asyncHandler(async (_req: Request, res: Response) => {
  const parts = await SparePart.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Spare parts fetched successfully.",
    data: parts,
  });
});

// ✅ Get by Slug
export const getSparePartBySlug = asyncHandler(async (req: Request, res: Response) => {
  const part = await SparePart.findOne({ slug: req.params.slug });
  if (!part) {
    res.status(404).json({ success: false, message: "Spare part not found." });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Spare part fetched successfully.",
    data: part,
  });
});

// ✅ Get by ID
export const getSparePartById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid spare part ID." });
    return;
  }
  const part = await SparePart.findById(id);
  if (!part) {
    res.status(404).json({ success: false, message: "Spare part not found." });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Spare part fetched successfully.",
    data: part,
  });
});

// ✅ Update Spare Part
export const updateSparePart = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid spare part ID." });
    return;
  }
  const part = await SparePart.findById(id);
  if (!part) {
    res.status(404).json({ success: false, message: "Spare part not found." });
    return;
  }

  const updates = req.body;
  Object.assign(part, updates);

  if (updates.tags) {
    try {
      part.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  if (req.files && Array.isArray(req.files)) {
    const newImages = (req.files as Express.Multer.File[]).map(file =>
      `${BASE_URL}/uploads/spareparts/${file.filename}`
    );
    part.image = [...(part.image || []), ...newImages];
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      part.image = part.image?.filter(img => !removed.includes(img));
      removed.forEach((imgUrl: string) => {
        const localPath = path.join("uploads", "spareparts", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {}
  }

  await part.save();

  res.status(200).json({
    success: true,
    message: "Spare part updated successfully.",
    data: part,
  });
});

// ✅ Delete Spare Part
export const deleteSparePart = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid spare part ID." });
    return;
  }

  const part = await SparePart.findByIdAndDelete(id);
  if (!part) {
    res.status(404).json({ success: false, message: "Spare part not found." });
    return;
  }

  part.image?.forEach((imgPath) => {
    const localPath = path.join("uploads", "spareparts", path.basename(imgPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  res.status(200).json({
    success: true,
    message: "Spare part deleted successfully.",
  });
});
