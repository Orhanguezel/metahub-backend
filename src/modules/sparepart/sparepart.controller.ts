import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SparePart from "./sparepart.models";
import fs from "fs";
import path from "path";

// 🧱 Yedek Parça Oluştur
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

  if (!label || !label.en || !label.tr || !label.de || !slug || !price) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Pflichtfelder fehlen."
        : req.locale === "tr"
        ? "Gerekli alanlar eksik."
        : "Required fields are missing",
    });
    return;
  }

  const imageFiles = req.files as Express.Multer.File[];
  const imageUrls = imageFiles?.length
    ? imageFiles.map(file => `${process.env.BASE_URL}/uploads/spareparts/${file.filename}`)
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
    image: imageUrls,
  });

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Ersatzteil erfolgreich erstellt."
      : req.locale === "tr"
      ? "Yedek parça başarıyla oluşturuldu."
      : "Spare part created successfully",
    sparePart,
  });
});

// 📋 Tüm Yedek Parçaları Getir
export const getAllSpareParts = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.query.language || req.locale || "en";
  const parts = await SparePart.find({ [`label.${lang}`]: { $exists: true } }).sort({ createdAt: -1 });
  res.status(200).json(parts);
});

// 🔍 Slug ile Getir
export const getSparePartBySlug = asyncHandler(async (req: Request, res: Response) => {
  const part = await SparePart.findOne({ slug: req.params.slug });
  if (!part) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Ersatzteil nicht gefunden."
        : req.locale === "tr"
        ? "Yedek parça bulunamadı."
        : "Spare part not found",
    });
    return;
  }
  res.status(200).json(part);
});

// 🔍 ID ile Getir
export const getSparePartById = asyncHandler(async (req: Request, res: Response) => {
  const part = await SparePart.findById(req.params.id);
  if (!part) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Ersatzteil nicht gefunden."
        : req.locale === "tr"
        ? "Yedek parça bulunamadı."
        : "Spare part not found",
    });
    return;
  }
  res.status(200).json(part);
});

// ✏️ Güncelle
export const updateSparePart = asyncHandler(async (req: Request, res: Response) => {
  const part = await SparePart.findById(req.params.id);
  if (!part) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Ersatzteil nicht gefunden."
        : req.locale === "tr"
        ? "Yedek parça bulunamadı."
        : "Spare part not found",
    });
    return;
  }

  const updates = req.body;

  part.label = updates.label ?? part.label;
  part.slug = updates.slug ?? part.slug;
  part.code = updates.code ?? part.code;
  part.description = updates.description ?? part.description;
  part.category = updates.category ?? part.category;
  part.manufacturer = updates.manufacturer ?? part.manufacturer;
  part.specifications = updates.specifications ?? part.specifications;
  part.stock = updates.stock ?? part.stock;
  part.price = updates.price ?? part.price;
  part.isPublished = typeof updates.isPublished === "boolean" ? updates.isPublished : part.isPublished;

  if (updates.tags) {
    try {
      part.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  if (req.files && Array.isArray(req.files)) {
    const newImages = (req.files as Express.Multer.File[]).map(file =>
      `${process.env.BASE_URL}/uploads/spareparts/${file.filename}`
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
    message: req.locale === "de"
      ? "Ersatzteil aktualisiert."
      : req.locale === "tr"
      ? "Yedek parça güncellendi."
      : "Spare part updated successfully",
    sparePart: part,
  });
});

// ❌ Sil
export const deleteSparePart = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await SparePart.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Ersatzteil nicht gefunden."
        : req.locale === "tr"
        ? "Yedek parça bulunamadı."
        : "Spare part not found",
    });
    return;
  }

  deleted.image?.forEach((imgPath) => {
    const localPath = path.join("uploads", "spareparts", path.basename(imgPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Ersatzteil gelöscht."
      : req.locale === "tr"
      ? "Yedek parça silindi."
      : "Spare part deleted successfully",
  });
});
