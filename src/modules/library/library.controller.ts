import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import LibraryItem from "./library.models";
import { BASE_URL } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// 🔹 Yeni belge oluştur (çok dilli destekli)
export const createLibraryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      slug,
      category,
      tags = [],
      fileType = "pdf",
      isPublished = false,
    } = req.body;

    const files = req.files as Express.Multer.File[];
    const fileUrl = files?.[0]
      ? `${BASE_URL}/uploads/library/${files[0].filename}`
      : "";

    if (!fileUrl) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Datei-Upload erforderlich."
            : req.locale === "tr"
            ? "Dosya yüklenmesi zorunludur."
            : "File upload is required.",
      });
      return;
    }

    const createdItems = [];

    for (const lang of ["tr", "en", "de"] as const) {
      const title = req.body[`title_${lang}`];
      const description = req.body[`description_${lang}`];
      if (!title || !description) continue;

      const item = await LibraryItem.create({
        title,
        slug: `${slug}-${lang}`,
        description,
        category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        fileType,
        fileUrl,
        isPublished: isPublished === "true" || isPublished === true,
        language: lang,
      });

      createdItems.push(item);
    }

    if (createdItems.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Mindestens ein gültiger Eintrag erforderlich."
            : req.locale === "tr"
            ? "En az bir geçerli dil alanı gereklidir."
            : "At least one valid language field is required.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Dokument(e) erfolgreich erstellt."
          : req.locale === "tr"
          ? "Belge(ler) başarıyla oluşturuldu."
          : "Library item(s) created successfully.",
      items: createdItems,
    });
  }
);

// 🔹 Tüm belgeleri getir (opsiyonel dil filtresiyle)
export const getAllLibraryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;

    const filter: any = {};
    if (lang) filter.language = lang;
    else filter.language = req.locale || "en";

    const items = await LibraryItem.find(filter).sort({ createdAt: -1 });
    res.status(200).json(items);
  }
);

// 🔹 Slug ile belge getir
export const getLibraryItemBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const item = await LibraryItem.findOne({ slug: req.params.slug });
    if (!item) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Dokument nicht gefunden."
            : req.locale === "tr"
            ? "Belge bulunamadı."
            : "Library item not found.",
      });
      return;
    }
    res.status(200).json(item);
  }
);

// 🔹 ID ile belge getir
export const getLibraryItemById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const item = await LibraryItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Dokument nicht gefunden."
            : req.locale === "tr"
            ? "Belge bulunamadı."
            : "Library item not found.",
      });
      return;
    }
    res.status(200).json(item);
  }
);

// 🔹 Güncelle
export const updateLibraryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates: any = { ...req.body };

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid library item ID" });
      return;
    }

    if (req.file) {
      updates.fileUrl = `${BASE_URL}/uploads/library/${req.file.filename}`;
    }

    const updated = await LibraryItem.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updated) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Dokument nicht gefunden."
            : req.locale === "tr"
            ? "Belge bulunamadı."
            : "Library item not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Dokument erfolgreich aktualisiert."
          : req.locale === "tr"
          ? "Belge başarıyla güncellendi."
          : "Library item updated successfully.",
      item: updated,
    });
  }
);

// 🔹 Sil
export const deleteLibraryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid library item ID" });
      return;
    }

    const deleted = await LibraryItem.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Dokument nicht gefunden."
            : req.locale === "tr"
            ? "Belge bulunamadı."
            : "Library item not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Dokument erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Belge başarıyla silindi."
          : "Library item deleted successfully.",
    });
  }
);
