import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Company from "./company.models";
import { isValidObjectId } from "../../core/utils/validation";

// 📄 Tüm şirket bilgisi (tek kayıt)
export const getCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
  const company = await Company.findOne();
  if (!company) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Firmeninformation nicht gefunden."
          : req.locale === "tr"
          ? "Şirket bilgisi bulunamadı."
          : "Company information not found.",
    });
    return;
  }

  res.status(200).json(company);
});

// ➕ Yeni şirket oluştur (sadece 1 kayıt izinli)
export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const exists = await Company.findOne();
  if (exists) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ein Unternehmen ist bereits registriert."
          : req.locale === "tr"
          ? "Zaten bir şirket kaydı mevcut."
          : "A company is already registered.",
    });
    return;
  }

  const newCompany = await Company.create(req.body);

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Unternehmen erfolgreich erstellt."
        : req.locale === "tr"
        ? "Şirket başarıyla oluşturuldu."
        : "Company created successfully.",
    company: newCompany,
  });
});

// ✏️ Şirket bilgilerini güncelle
export const updateCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Firmen-ID."
          : req.locale === "tr"
          ? "Geçersiz şirket ID."
          : "Invalid company ID.",
    });
    return;
  }

  const updated = await Company.findByIdAndUpdate(id, req.body, { new: true });

  if (!updated) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Firma nicht gefunden."
          : req.locale === "tr"
          ? "Şirket bulunamadı."
          : "Company not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Firmendaten aktualisiert."
        : req.locale === "tr"
        ? "Şirket bilgileri güncellendi."
        : "Company info updated.",
    company: updated,
  });
});
