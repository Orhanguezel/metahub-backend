// src/controllers/references.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {Reference} from "./references.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// ✅ Referans oluştur
export const createReference = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    ? req.files.map((file: Express.Multer.File) => `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`)
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
    message: req.locale === "de"
      ? "Referenz erfolgreich erstellt."
      : req.locale === "tr"
      ? "Referans başarıyla oluşturuldu."
      : "Reference created successfully",
    reference,
  });
});

// ✅ Tüm referansları getir
export const getAllReferences = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const references = await Reference.find().sort({ createdAt: -1 });
  res.status(200).json(references);
});

// ✅ Slug ile referans getir
export const getReferenceBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reference = await Reference.findOne({ slug: req.params.slug });

  if (!reference) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Referenz nicht gefunden."
        : req.locale === "tr"
        ? "Referans bulunamadı."
        : "Reference not found",
    });
    return;
  }

  res.status(200).json(reference);
});

// ✅ ID ile referans getir
export const getReferenceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reference = await Reference.findById(req.params.id);

  if (!reference) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Referenz nicht gefunden."
        : req.locale === "tr"
        ? "Referans bulunamadı."
        : "Reference not found",
    });
    return;
  }

  res.status(200).json(reference);
});

// ✅ Referans güncelle
export const updateReference = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const reference = await Reference.findById(id);
  if (!reference) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Referenz nicht gefunden."
        : req.locale === "tr"
        ? "Referans bulunamadı."
        : "Reference not found",
    });
    return;
  }

  Object.assign(reference, updates);

  if (updates.tags) {
    try {
      reference.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  const files = req.files as Express.Multer.File[];
  const newLogos = files?.map((file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`) || [];
  if (newLogos.length > 0) {
    reference.logos = [...reference.logos, ...newLogos];
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      reference.logos = reference.logos.filter((img: string) => !removed.includes(img));
      removed.forEach((imgUrl: string) => {
        const localPath = path.join("uploads", "references", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {}
  }

  await reference.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Referenz erfolgreich aktualisiert."
      : req.locale === "tr"
      ? "Referans başarıyla güncellendi."
      : "Reference updated successfully",
    reference,
  });
});

// ✅ Referans sil
export const deleteReference = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reference = await Reference.findById(req.params.id);

  if (!reference) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Referenz nicht gefunden."
        : req.locale === "tr"
        ? "Referans bulunamadı."
        : "Reference not found",
    });
    return;
  }

  reference.logos.forEach((logoPath) => {
    const localPath = path.join("uploads", "references", path.basename(logoPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  await reference.deleteOne();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Referenz erfolgreich gelöscht."
      : req.locale === "tr"
      ? "Referans başarıyla silindi."
      : "Reference deleted successfully",
  });
});
