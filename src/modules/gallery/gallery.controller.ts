import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Gallery from "./gallery.models";
import { isValidObjectId } from "../../core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";

// 📤 Çoklu medya yükle (3 dilde)
export const uploadGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

    const uploadedItems = [];

    for (const lang of ["tr", "en", "de"] as const) {
      const title = req.body[`title_${lang}`];
      if (!title) continue;

      for (const file of files) {
        const item = await Gallery.create({
          title,
          image: `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`
,
          type,
          language: lang,
        });
        uploadedItems.push(item);
      }
    }

    if (uploadedItems.length === 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Keine gültigen Einträge erstellt."
            : req.locale === "tr"
            ? "Geçerli bir kayıt oluşturulamadı."
            : "No valid entries were created.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Medien erfolgreich hochgeladen."
          : req.locale === "tr"
          ? "Medya başarıyla yüklendi."
          : "Media uploaded successfully.",
      items: uploadedItems,
    });
  }
);

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
