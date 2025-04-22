import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Reference from "./references.models";
import { BASE_URL,UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// 🔹 Yeni referans oluştur (çoklu görsel)
export const createReference = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      companyName,
      slug,
      url,
      sector,
      country,
      year,
      tags = [],
      language = "en",
      description = "",
      isPublished = false,
    } = req.body;

    // 🎯 Çoklu görselleri işle (req.files bir array olacak)
    const logos = Array.isArray(req.files)
      ? req.files.map(
          (file: Express.Multer.File) =>
            `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`

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
      language,
      isPublished,
      logos,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Referenz erfolgreich erstellt."
          : req.locale === "tr"
          ? "Referans başarıyla oluşturuldu."
          : "Reference created successfully",
      reference,
    });
  }
);

// 🔹 Tüm referansları getir
export const getAllReferences = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const references = await Reference.find().sort({ createdAt: -1 });
    res.status(200).json(references);
  }
);

// 🔹 Slug ile referans getir
export const getReferenceBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reference = await Reference.findOne({ slug: req.params.slug });
    if (!reference) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Referenz nicht gefunden."
            : req.locale === "tr"
            ? "Referans bulunamadı."
            : "Reference not found",
      });
      return;
    }
    res.status(200).json(reference);
  }
);

// 🔹 ID ile referans getir
export const getReferenceById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reference = await Reference.findById(req.params.id);
    if (!reference) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Referenz nicht gefunden."
            : req.locale === "tr"
            ? "Referans bulunamadı."
            : "Reference not found",
      });
      return;
    }
    res.status(200).json(reference);
  }
);

export const updateReference = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;

    const reference = await Reference.findById(id);
    if (!reference) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Referenz nicht gefunden."
            : req.locale === "tr"
            ? "Referans bulunamadı."
            : "Reference not found",
      });
      return;
    }

    // 🎯 Kısmi güncellemeler
    reference.companyName = updates.companyName ?? reference.companyName;
    reference.slug = updates.slug ?? reference.slug;
    reference.url = updates.url ?? reference.url;
    reference.sector = updates.sector ?? reference.sector;
    reference.country = updates.country ?? reference.country;
    reference.year = updates.year ?? reference.year;
    reference.description = updates.description ?? reference.description;
    reference.language = updates.language ?? reference.language;
    reference.isPublished =
      typeof updates.isPublished !== "undefined"
        ? updates.isPublished === "true"
        : reference.isPublished;

    // 🏷️ Etiket güncellemesi (dizi ya da JSON string olarak desteklenir)
    if (updates.tags) {
      try {
        reference.tags =
          typeof updates.tags === "string"
            ? JSON.parse(updates.tags)
            : updates.tags;
      } catch {
        // etiketler bozuksa geç
      }
    }

    // 🖼️ Yeni logo görselleri geldiyse ekle
    const files = req.files as Express.Multer.File[];
    const newLogos =
      files?.map((file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/references/${file.filename}`
) ||
      [];

    if (newLogos.length > 0) {
      reference.logos = [...reference.logos, ...newLogos];
    }

    // ❌ Silinen logolar varsa çıkar
    if (updates.removedImages) {
      try {
        const removed = JSON.parse(updates.removedImages);
        reference.logos = reference.logos.filter(
          (img: string) => !removed.includes(img)
        );

        removed.forEach((imgUrl: string) => {
          const localPath = path.join(
            "uploads",
            "references",
            path.basename(imgUrl)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        });
      } catch {
        // JSON parse hatası vs varsa geç
      }
    }

    // 💾 Kaydet
    await reference.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Referenz erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Referans başarıyla güncellendi."
          : "Reference updated successfully",
      reference,
    });
  }
);

export const deleteReference = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reference = await Reference.findById(req.params.id);
    if (!reference) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Referenz nicht gefunden."
            : req.locale === "tr"
            ? "Referans bulunamadı."
            : "Reference not found",
      });
      return;
    }

    // 🗑️ Görselleri sil
    if (reference.logos?.length) {
      reference.logos.forEach((logoPath) => {
        const localPath = path.join(
          "uploads",
          "references",
          path.basename(logoPath)
        );
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      });
    }

    // Veritabanından sil
    await reference.deleteOne();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Referenz erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Referans başarıyla silindi."
          : "Reference deleted successfully",
    });
  }
);
