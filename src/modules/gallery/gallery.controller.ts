import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Gallery from "./gallery.models";
import { isValidObjectId } from "../../core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";

// 📤 Çoklu medya yükle (3 dilde)
export const uploadGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type = "image" }: { type?: "image" | "video" } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Keine Datei hochgeladen."
          : req.locale === "tr"
          ? "Dosya yüklenmedi."
          : "No files uploaded.",
    });
    return;
  }

  const label = {
    tr: req.body.title_tr || "",
    en: req.body.title_en || "",
    de: req.body.title_de || "",
  };

  const paths = files.map((file) => `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`);
  const newItem = await Gallery.create({ title: label, image: paths, type });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Medien erfolgreich hochgeladen."
        : req.locale === "tr"
        ? "Medya başarıyla yüklendi."
        : "Media uploaded successfully.",
    item: newItem,
  });
});


export const getAllGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;

    const filter: any = {};
    filter.language = lang || req.locale || "en";

    const items = await Gallery.find(filter).sort({ createdAt: -1 });
    res.status(200).json(items);
  }
);

export const deleteGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid media ID" });
      return;
    }

    const item = await Gallery.findByIdAndDelete(id);
    if (!item) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Medienelement wurde nicht gefunden."
            : req.locale === "tr"
            ? "Medya bulunamadı."
            : "Media not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Medienelement wurde gelöscht."
          : req.locale === "tr"
          ? "Medya başarıyla silindi."
          : "Media deleted successfully.",
    });
  }
);

export const getPublishedGalleryItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const items = await Gallery.find({ isPublished: true, isActive: true }).sort({ createdAt: -1 });
  res.status(200).json(items);
});

export const togglePublishGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ message: "Media not found." });
    return;
  }

  item.isPublished = !item.isPublished;
  await item.save();

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? `Medienstatus wurde auf ${item.isPublished ? "veröffentlicht" : "entfernt"} gesetzt.`
        : req.locale === "tr"
        ? `Medya ${item.isPublished ? "yayınlandı" : "yayından kaldırıldı"}.`
        : `Media ${item.isPublished ? "published" : "unpublished"}.`,
    item,
  });
});

export const softDeleteGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ message: "Media not found." });
    return;
  }

  item.isActive = false;
  await item.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Medieneintrag archiviert."
        : req.locale === "tr"
        ? "Medya arşivlendi."
        : "Media item archived.",
  });
});

export const updateGalleryItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title_tr, title_en, title_de, type, isPublished } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ message: "Media not found." });
    return;
  }

  if (title_tr) item.title.tr = title_tr;
  if (title_en) item.title.en = title_en;
  if (title_de) item.title.de = title_de;
  if (type) item.type = type;
  if (typeof isPublished === "boolean") item.isPublished = isPublished;

  await item.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Medien erfolgreich aktualisiert."
        : req.locale === "tr"
        ? "Medya başarıyla güncellendi."
        : "Media updated successfully.",
    item,
  });
});




