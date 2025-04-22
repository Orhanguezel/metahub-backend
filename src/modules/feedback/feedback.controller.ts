import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Feedback from "./feedback.models";
import { isValidObjectId } from "../../core/utils/validation";

// 💬 Yeni geri bildirim oluştur (herkes)
export const createFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, message, rating } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Bitte füllen Sie alle Pflichtfelder aus."
            : req.locale === "tr"
            ? "Lütfen tüm gerekli alanları doldurun."
            : "Please fill all required fields.",
      });
      return;
    }

    const feedback = await Feedback.create({
      name,
      email,
      message,
      rating,
      language: req.locale || "en",
    });

    res.status(201).json({
      message:
        req.locale === "de"
          ? "Feedback wurde gesendet."
          : req.locale === "tr"
          ? "Geri bildirim gönderildi."
          : "Feedback submitted successfully.",
      feedback,
    });
  }
);

// 🔐 Tüm geri bildirimleri getir (admin, opsiyonel dil filtresi)
export const getAllFeedbacks = asyncHandler(
  async (req: Request, res: Response) => {
    const { lang } = req.query;
    const filter: any = {};

    if (lang) filter.language = lang;

    const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  }
);

// 🔁 Yayın durumunu değiştir (admin)
export const togglePublishFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Feedback nicht gefunden."
            : req.locale === "tr"
            ? "Geri bildirim bulunamadı."
            : "Feedback not found.",
      });
      return;
    }

    feedback.isPublished = !feedback.isPublished;
    await feedback.save();

    res.status(200).json({
      message:
        req.locale === "de"
          ? `Feedback wurde ${
              feedback.isPublished ? "veröffentlicht" : "entfernt"
            }.`
          : req.locale === "tr"
          ? `Geri bildirim ${
              feedback.isPublished ? "yayınlandı" : "yayından kaldırıldı"
            }.`
          : `Feedback ${feedback.isPublished ? "published" : "unpublished"}.`,
      feedback,
    });
  }
);

// ❌ Geri bildirimi sil (admin)
export const deleteFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid ID" });
      return;
    }

    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Feedback wurde nicht gefunden."
            : req.locale === "tr"
            ? "Geri bildirim bulunamadı."
            : "Feedback not found.",
      });
      return;
    }

    res.status(200).json({
      message:
        req.locale === "de"
          ? "Feedback wurde gelöscht."
          : req.locale === "tr"
          ? "Geri bildirim silindi."
          : "Feedback deleted successfully.",
    });
  }
);
