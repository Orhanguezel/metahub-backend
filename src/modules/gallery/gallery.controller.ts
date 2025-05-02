import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {Gallery} from "../gallery";
import { isValidObjectId } from "@/core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";

// 📤 Upload multiple media
export const uploadGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type = "image" }: { type?: "image" | "video" } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({
      success: false,
      message: "No files uploaded.",
    });
    return;
  }

  const label = {
    tr: req.body.title_tr || "",
    en: req.body.title_en || "",
    de: req.body.title_de || "",
  };

  const paths = files.map((file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`);
  const newItem = await Gallery.create({ title: label, image: paths, type });

  res.status(201).json({
    success: true,
    message: "Media uploaded successfully.",
    data: newItem,
  });
});

// 📥 Get all gallery items (Admin)
export const getAllGalleryItems = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const items = await Gallery.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Gallery items fetched successfully.",
    data: items,
  });
});

// 📥 Get published gallery items (Public)
export const getPublishedGalleryItems = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const items = await Gallery.find({ isPublished: true, isActive: true }).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Published gallery items fetched successfully.",
    data: items,
  });
});

// 🗑️ Delete gallery item
export const deleteGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid media ID." });
    return;
  }

  const item = await Gallery.findByIdAndDelete(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Media deleted successfully.",
  });
});

// 🔄 Toggle publish status
export const togglePublishGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid media ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  item.isPublished = !item.isPublished;
  await item.save();

  res.status(200).json({
    success: true,
    message: `Media ${item.isPublished ? "published" : "unpublished"} successfully.`,
    data: item,
  });
});

// 🗃️ Soft delete (archive)
export const softDeleteGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid media ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  item.isActive = false;
  await item.save();

  res.status(200).json({
    success: true,
    message: "Media item archived successfully.",
  });
});

// ✏️ Update gallery item
export const updateGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title_tr, title_en, title_de, type, isPublished } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid media ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  if (title_tr) item.title.tr = title_tr;
  if (title_en) item.title.en = title_en;
  if (title_de) item.title.de = title_de;
  if (type) item.type = type;
  if (typeof isPublished === "boolean") item.isPublished = isPublished;

  await item.save();

  res.status(200).json({
    success: true,
    message: "Media updated successfully.",
    data: item,
  });
});
