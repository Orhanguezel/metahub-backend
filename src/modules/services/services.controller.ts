// src/controllers/services.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Service from "./services.models";
import { BASE_URL } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// ✅ Hizmet oluştur
export const createService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    title,
    shortDescription,
    detailedDescription,
    price,
    durationMinutes,
    category,
    tags = [],
    isPublished = false,
  } = req.body;

  if (!title || !price || !durationMinutes) {
    res.status(400).json({
      message: req.locale === "de"
        ? "Titel, Preis und Dauer sind erforderlich."
        : req.locale === "tr"
        ? "Başlık, fiyat ve süre gereklidir."
        : "Title, price and duration are required."
    });
    return;
  }

  const images = Array.isArray(req.files)
    ? req.files.map((file: Express.Multer.File) => `${BASE_URL}/uploads/service-images/${file.filename}`)
    : [];

  const service = await Service.create({
    title,
    shortDescription,
    detailedDescription,
    price,
    durationMinutes,
    category,
    tags: typeof tags === "string" ? JSON.parse(tags) : tags,
    isPublished,
    images,
  });

  res.status(201).json({
    success: true,
    message: req.locale === "de"
      ? "Dienstleistung erfolgreich erstellt."
      : req.locale === "tr"
      ? "Hizmet başarıyla oluşturuldu."
      : "Service created successfully",
    service,
  });
});

// ✅ Tüm hizmetleri getir
export const getAllServices = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const services = await Service.find().sort({ createdAt: -1 });
  res.status(200).json(services);
});

// ✅ Tek hizmet getir
export const getServiceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Dienstleistung nicht gefunden."
        : req.locale === "tr"
        ? "Hizmet bulunamadı."
        : "Service not found",
    });
    return;
  }

  res.status(200).json(service);
});

// ✅ Hizmet güncelle
export const updateService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Dienstleistung nicht gefunden."
        : req.locale === "tr"
        ? "Hizmet bulunamadı."
        : "Service not found",
    });
    return;
  }

  const updates = req.body;

  Object.assign(service, updates);

  if (updates.tags) {
    try {
      service.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map((file) => `${BASE_URL}/uploads/service-images/${file.filename}`) || [];
  if (newImages.length > 0) {
    service.images = [...service.images, ...newImages];
  }

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      service.images = service.images.filter((img) => !removed.includes(img));
      removed.forEach((imgUrl: string) => {
        const localPath = path.join("uploads", "service-images", path.basename(imgUrl));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } catch {}
  }

  await service.save();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Dienstleistung aktualisiert."
      : req.locale === "tr"
      ? "Hizmet başarıyla güncellendi."
      : "Service updated successfully",
    service,
  });
});

// ✅ Hizmet sil
export const deleteService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Dienstleistung nicht gefunden."
        : req.locale === "tr"
        ? "Hizmet bulunamadı."
        : "Service not found",
    });
    return;
  }

  service.images.forEach((imgPath) => {
    const localPath = path.join("uploads", "service-images", path.basename(imgPath));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });

  await service.deleteOne();

  res.status(200).json({
    success: true,
    message: req.locale === "de"
      ? "Dienstleistung gelöscht."
      : req.locale === "tr"
      ? "Hizmet silindi."
      : "Service deleted successfully",
  });
});
