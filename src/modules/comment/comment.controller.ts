import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Comment from "./comment.models";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Yorum oluştur
export const createComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, comment, contentType, contentId, language } = req.body;

    if (!name || !email || !comment || !contentType || !contentId) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Pflichtfelder fehlen."
            : req.locale === "tr"
            ? "Zorunlu alanlar eksik."
            : "Required fields are missing.",
      });
      return;
    }

    const newComment = await Comment.create({
      name,
      email,
      comment,
      contentType,
      contentId,
      language: language || req.locale || "en",
      isPublished: false, // Onay sonrası gösterilsin
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Kommentar gespeichert, wird geprüft."
          : req.locale === "tr"
          ? "Yorum kaydedildi. Yayınlanmadan önce onaylanacak."
          : "Comment saved. Will be reviewed before publishing.",
      comment: newComment,
    });
  }
);

// ✅ Tüm yorumları getir (admin)
export const getAllComments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;
    const filter: any = {};
    if (lang) filter.language = lang;

    const comments = await Comment.find(filter).sort({ createdAt: -1 });
    res.status(200).json(comments);
  }
);

// ✅ İçerik bazlı yorumları getir (yayınlanmışlar)
export const getCommentsForContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type, id } = req.params;

    if (!["blog", "product", "service"].includes(type)) {
      res.status(400).json({ message: "Invalid content type" });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid content ID" });
      return;
    }

    const comments = await Comment.find({
      contentType: type,
      contentId: id,
      isPublished: true,
      isActive: true,
      language: req.locale || "en",
    }).sort({ createdAt: -1 });

    res.status(200).json(comments);
  }
);

// ✅ Admin: yayına al / kaldır
export const togglePublishComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid comment ID" });
      return;
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Kommentar nicht gefunden."
            : req.locale === "tr"
            ? "Yorum bulunamadı."
            : "Comment not found.",
      });
      return;
    }

    comment.isPublished = !comment.isPublished;
    await comment.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? `Kommentar wurde ${
              comment.isPublished ? "veröffentlicht" : "zurückgezogen"
            }.`
          : req.locale === "tr"
          ? `Yorum ${
              comment.isPublished ? "yayınlandı" : "yayından kaldırıldı"
            }.`
          : `Comment ${comment.isPublished ? "published" : "unpublished"}.`,
      comment,
    });
  }
);

// ✅ Soft delete
export const deleteComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid comment ID" });
      return;
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Kommentar nicht gefunden."
            : req.locale === "tr"
            ? "Yorum bulunamadı."
            : "Comment not found.",
      });
      return;
    }

    comment.isActive = false;
    await comment.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Kommentar archiviert."
          : req.locale === "tr"
          ? "Yorum arşivlendi."
          : "Comment archived.",
    });
  }
);
