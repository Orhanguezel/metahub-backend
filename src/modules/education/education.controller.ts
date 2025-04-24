import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Education from "./education.models";

// 🎓 Tüm eğitim kayıtlarını getir
export const getAllEducation = asyncHandler(async (_req: Request, res: Response) => {
  const education = await Education.find().sort({ createdAt: -1 });
  res.status(200).json(education);
});

// ➕ Yeni eğitim kaydı oluştur
export const createEducation = asyncHandler(async (req: Request, res: Response) => {
  const { degree, institution, period, image } = req.body;

  if (
    !degree?.tr || !degree?.en || !degree?.de ||
    !institution?.tr || !institution?.en || !institution?.de ||
    !period
  ) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Alle Felder sind erforderlich."
          : req.locale === "tr"
          ? "Tüm alanlar gereklidir (derece, kurum, dönem ve tüm dillerde çeviri)."
          : "All fields are required (degree, institution, period and translations in all languages).",
    });
    return;
  }

  const newEducation = await Education.create({
    degree: {
      tr: degree.tr,
      en: degree.en,
      de: degree.de,
    },
    institution: {
      tr: institution.tr,
      en: institution.en,
      de: institution.de,
    },
    period,
    image,
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Ausbildung erfolgreich hinzugefügt."
        : req.locale === "tr"
        ? "Eğitim bilgisi başarıyla eklendi."
        : "Education entry created successfully.",
    education: newEducation,
  });
});
