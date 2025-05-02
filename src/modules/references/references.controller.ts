import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Reference } from "@/modules/references";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// 🔧 Yardımcı fonksiyon: Dil bazlı mesaj
const getMessage = (locale: string | undefined, tr: string, en: string, de: string) => {
  switch (locale) {
    case "tr": return tr;
    case "de": return de;
    default: return en;
  }
};

// ✅ Referans oluştur
export const createReference = asyncHandler(async (req: Request, res: Response) => {
  const {
    companyName,
    slug,
    url,
    sector,
    country,
    year,
    tags = [],
    description = {},
    isPublished = false,
  } = req.body;

  const logos = Array.isArray(req.files)
    ? (req.files as Express.Multer.File[]).map(
        (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`
      )
    : [];

  const reference = await Reference.create({
    companyName,
    slug,
    url,
    sector,
    country,
    year,
    tags,
    description,
    isPublished,
    logos,
  });

  res.status(201).json({
    success: true,
    message: getMessage(req.locale, "Referans başarıyla oluşturuldu.", "Reference created successfully", "Referenz erfolgreich erstellt."),
    data: reference,
  });
});

// ✅ Tüm referansları getir
export const getAllReferences = asyncHandler(async (_req: Request, res: Response) => {
  const references = await Reference.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "References fetched successfully.",
    data: references,
  });
});

// ✅ Slug ile referans getir
export const getReferenceBySlug = asyncHandler(async (req: Request, res: Response) => {
  const reference = await Reference.findOne({ slug: req.params.slug });
  if (!reference) {
    res.status(404);
    throw new Error(getMessage(req.locale, "Referans bulunamadı.", "Reference not found", "Referenz nicht gefunden."));
  }

  res.status(200).json({
    success: true,
    message: "Reference fetched successfully.",
    data: reference,
  });
});

// ✅ ID ile referans getir
export const getReferenceById = asyncHandler(async (req: Request, res: Response) => {
  const reference = await Reference.findById(req.params.id);
  if (!reference) {
    res.status(404);
    throw new Error(getMessage(req.locale, "Referans bulunamadı.", "Reference not found", "Referenz nicht gefunden."));
  }

  res.status(200).json({
    success: true,
    message: "Reference fetched successfully.",
    data: reference,
  });
});

// ✅ Referans güncelle
export const updateReference = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const reference = await Reference.findById(id);
  if (!reference) {
    res.status(404);
    throw new Error(getMessage(req.locale, "Referans bulunamadı.", "Reference not found", "Referenz nicht gefunden."));
  }

  Object.assign(reference, updates);

  // Tags array kontrolü
  if (updates.tags) {
    try {
      reference.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {
      // Sessiz geç
    }
  }

  // Logo ekleme
  const files = req.files as Express.Multer.File[];
  const newLogos = files?.map(
    (file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`
  ) || [];
  if (newLogos.length > 0) {
    reference.logos.push(...newLogos);
  }

  // Silinen resimleri kaldır
  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      reference.logos = reference.logos.filter((img: string) => !removed.includes(img));
      removed.forEach((imgUrl: string) => {
        const localPath = path.join("uploads", "references", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {
      // Sessiz geç
    }
  }

  await reference.save();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Referans başarıyla güncellendi.", "Reference updated successfully", "Referenz erfolgreich aktualisiert."),
    data: reference,
  });
});

// ✅ Referans sil
export const deleteReference = asyncHandler(async (req: Request, res: Response) => {
  const reference = await Reference.findById(req.params.id);
  if (!reference) {
    res.status(404);
    throw new Error(getMessage(req.locale, "Referans bulunamadı.", "Reference not found", "Referenz nicht gefunden."));
  }

  // Dosyaları sil
  reference.logos.forEach((logoPath) => {
    const localPath = path.join("uploads", "references", path.basename(logoPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  await reference.deleteOne();

  res.status(200).json({
    success: true,
    message: getMessage(req.locale, "Referans başarıyla silindi.", "Reference deleted successfully", "Referenz erfolgreich gelöscht."),
  });
});
