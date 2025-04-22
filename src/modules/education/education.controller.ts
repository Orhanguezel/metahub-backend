import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Education from "./education.models";

// 🎓 Eğitim bilgilerini getir
export const getAllEducation = asyncHandler(async (_req: Request, res: Response) => {
  const education = await Education.find().sort({ createdAt: -1 });
  res.status(200).json(education);
});

// ➕ Yeni eğitim kaydı ekle
export const createEducation = asyncHandler(async (req: Request, res: Response) => {
  const { degree, institution, period, image } = req.body;

  if (!degree || !institution || !period) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Alle Felder sind erforderlich."
          : req.locale === "tr"
          ? "Derece, kurum ve dönem zorunludur."
          : "Degree, institution and period are required.",
    });
    return;
  }

  const newEducation = await Education.create({ degree, institution, period, image });

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
