import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Sport from "./sport.models";
import { BASE_URL,UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// 📥 Yeni spor ekle (çoklu resimli)
export const createSport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description, category, language } = req.body;

  const files = req.files as Express.Multer.File[];
  const imageUrls = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/sport-images/${file.filename}`
) || [];

  if (!name || imageUrls.length === 0) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Name und mindestens ein Bild erforderlich."
          : req.locale === "tr"
          ? "Ad ve en az bir görsel gereklidir."
          : "Name and at least one image are required.",
    });
    return;
  }

  const sport = await Sport.create({
    name,
    description,
    category,
    images: imageUrls,
    language: language || req.locale || "en",
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Sport erfolgreich erstellt."
        : req.locale === "tr"
        ? "Spor başarıyla oluşturuldu."
        : "Sport created successfully.",
    sport,
  });
});

// 📄 Tüm sporları getir
export const getAllSports = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const lang = req.query.lang || req.locale || "en";
  const sports = await Sport.find({ language: lang }).sort({ createdAt: -1 });
  res.status(200).json(sports);
});

// 🔍 ID ile spor getir
export const getSportById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sport = await Sport.findById(req.params.id);
  if (!sport) {
    res.status(404).json({
      message:
        req.locale === "de"
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
      message:
        req.locale === "de"
          ? "Sport nicht gefunden."
          : req.locale === "tr"
          ? "Spor bulunamadı."
          : "Sport not found.",
    });
    return;
  }

  const { name, description, category, language } = req.body;

  if (name) sport.name = name;
  if (description) sport.description = description;
  if (category) sport.category = category;
  if (language) sport.language = language;

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/sport-images/${file.filename}`
) || [];
  if (newImages.length > 0) {
    sport.images = [...sport.images, ...newImages];
  }

  await sport.save();

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
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
      message:
        req.locale === "de"
          ? "Sport nicht gefunden."
          : req.locale === "tr"
          ? "Spor bulunamadı."
          : "Sport not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Sport gelöscht."
        : req.locale === "tr"
        ? "Spor silindi."
        : "Sport deleted successfully.",
  });
});
