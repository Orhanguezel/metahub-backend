import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Experience from "./experience.model";

// 🔹 Get all experiences (optional lang filter)
export const getAllExperiences = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.query.lang || req.locale || "en";

  const experiences = await Experience.find({ language: lang }).sort({ createdAt: -1 });

  res.status(200).json(experiences);
});

// 🔹 Add new experience
export const createExperience = asyncHandler(async (req: Request, res: Response) => {
  const { position, company, period, description, location, image, language } = req.body;

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
    language: language || req.locale || "en",
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
