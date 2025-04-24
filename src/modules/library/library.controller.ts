import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import LibraryItem from "./library.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// 📁 Çok dilli yeni kütüphane içeriği oluştur
export const createLibraryItem = asyncHandler(async (req: Request, res: Response) => {
  const { category, tags = [], fileType = "pdf", isPublished = false } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
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

  const fileUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/library/${files[0].filename}`;
  const createdItems = [];

  for (const lang of ["tr", "en", "de"] as const) {
    const title = req.body[`title_${lang}`];
    const description = req.body[`description_${lang}`];
    if (!title || !description) continue;

    const slugBase = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    const finalSlug = `${slugBase}-${lang}`;

    const item = await LibraryItem.create({
      title: { [lang]: title },
      slug: finalSlug,
      description: { [lang]: description },
      category,
      tags: typeof tags === "string" ? JSON.parse(tags) : tags,
      fileType,
      fileUrl,
      isPublished: isPublished === "true" || isPublished === true,
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
});

// 📥 Dil filtresine göre tüm içerikleri getir
export const getAllLibraryItems = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.query.lang || req.locale || "en";

  const filter: any = { [`title.${lang}`]: { $exists: true } };

  const items = await LibraryItem.find(filter).sort({ createdAt: -1 });
  res.status(200).json(items);
});

// 📘 Slug ile içerik getir
export const getLibraryItemBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const item = await LibraryItem.findOne({ slug });
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
});

// 📘 ID ile içerik getir
export const getLibraryItemById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid library item ID" });
    return;
  }

  const item = await LibraryItem.findById(id);
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
});

// ✏️ İçerik güncelle
export const updateLibraryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid library item ID" });
    return;
  }

  const updates: any = { ...req.body };

  if (req.file) {
    updates.fileUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/library/${req.file.filename}`;
  }

  const updated = await LibraryItem.findByIdAndUpdate(id, updates, { new: true });

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
});

// 🗑️ Sil (hard delete)
export const deleteLibraryItem = asyncHandler(async (req: Request, res: Response) => {
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
});
