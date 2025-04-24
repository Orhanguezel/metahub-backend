import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Experience from "./experience.models";

// 🔹 Tüm deneyimleri getir (dil filtreli)
export const getAllExperiences = asyncHandler(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || req.locale || "en";

  const experiences = await Experience.find({
    [`position.${lang}`]: { $exists: true },
    [`company.${lang}`]: { $exists: true },
  }).sort({ createdAt: -1 });

  res.status(200).json(experiences);
});

// 🔹 Yeni deneyim ekle
export const createExperience = asyncHandler(async (req: Request, res: Response) => {
  const {
    position,
    company,
    period,
    description,
    location,
    image,
  } = req.body;

  if (!position || !company || !period) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Position, Unternehmen und Zeitraum sind erforderlich."
          : req.locale === "tr"
          ? "Pozisyon, şirket ve dönem alanları zorunludur."
          : "Position, company and period are required.",
    });
    return;
  }

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
    message:
      req.locale === "de"
        ? "Berufserfahrung erfolgreich hinzugefügt."
        : req.locale === "tr"
        ? "Deneyim başarıyla eklendi."
        : "Experience created successfully.",
    experience: newExperience,
  });
});
