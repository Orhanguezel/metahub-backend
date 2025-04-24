import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Sport from "./sport.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// ➕ Spor oluştur
export const createSport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { label, description, category } = req.body;

  if (!label?.tr || !label?.en || !label?.de) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Bezeichnung in allen Sprachen ist erforderlich."
        : req.locale === "tr"
        ? "Tüm dillerde başlık gereklidir."
        : "Label is required in all languages.",
    });
    return;
  }

  const files = req.files as Express.Multer.File[];
  const images = files?.map(file =>
    `${BASE_URL}/${UPLOAD_BASE_PATH}/sport/${file.filename}`
  ) || [];

  if (images.length === 0) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Mindestens ein Bild erforderlich."
        : req.locale === "tr"
        ? "En az bir görsel gereklidir."
        : "At least one image is required.",
    });
    return;
  }

  const sport = await Sport.create({
    label,
    description,
    category,
    images,
  });

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Sport erfolgreich erstellt."
      : req.locale === "tr"
      ? "Spor başarıyla oluşturuldu."
      : "Sport created successfully.",
    sport,
  });
});

// 📄 Tüm sporları getir
export const getAllSports = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sports = await Sport.find().sort({ createdAt: -1 });
  res.status(200).json(sports);
});

// 🔍 Spor getir
export const getSportById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sport = await Sport.findById(req.params.id);
  if (!sport) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Sport nicht gefunden."
        : req.locale === "tr"
        ? "Spor bulunamadı."
        : "Sport not found.",
    });
    return;
  }

  res.status(200).json(sport);
});

// ✏️ Spor güncelle
export const updateSport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sport = await Sport.findById(req.params.id);
  if (!sport) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Sport nicht gefunden."
        : req.locale === "tr"
        ? "Spor bulunamadı."
        : "Sport not found.",
    });
    return;
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
    message: req.locale === "de"
      ? "Sport aktualisiert."
      : req.locale === "tr"
      ? "Spor güncellendi."
      : "Sport updated successfully.",
    sport,
  });
});

// 🗑️ Spor sil
export const deleteSport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sport = await Sport.findByIdAndDelete(req.params.id);
  if (!sport) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Sport nicht gefunden."
        : req.locale === "tr"
        ? "Spor bulunamadı."
        : "Sport not found.",
    });
    return;
  }

  sport.images?.forEach(imgUrl => {
    const localPath = path.join("uploads", "sport", path.basename(imgUrl));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Sport gelöscht."
      : req.locale === "tr"
      ? "Spor silindi."
      : "Sport deleted successfully.",
  });
});
