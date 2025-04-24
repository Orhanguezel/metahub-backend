import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Feedback from "./feedback.models";
import { isValidObjectId } from "../../core/utils/validation";

// 💬 Yeni geri bildirim oluştur
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message, rating } = req.body;

  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const isValidMessage = langs.every((l) => message?.[l]);

  if (!name || !email || !isValidMessage) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Bitte alle Pflichtfelder ausfüllen."
          : req.locale === "tr"
          ? "Tüm zorunlu alanlar doldurulmalıdır."
          : "All required fields must be filled.",
    });
    return;
  }

  const feedback = await Feedback.create({
    name,
    email,
    message,
    rating,
    isPublished: false,
    isActive: true,
  });

  res.status(201).json({
    message:
      req.locale === "de"
        ? "Feedback wurde gesendet."
        : req.locale === "tr"
        ? "Geri bildirim başarıyla gönderildi."
        : "Feedback submitted successfully.",
    feedback,
  });
});


// 🔐 Tüm geri bildirimleri getir (isteğe bağlı dil filtresi)
export const getAllFeedbacks = asyncHandler(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || req.locale || "en";
  const filter = {
    [`message.${lang}`]: { $exists: true },
  };

  const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
  res.status(200).json(feedbacks);
});


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

// ✏️ Geri bildirimi güncelle (admin)
export const updateFeedback = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, message, rating, isPublished, isActive } = req.body;

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

  if (name) feedback.name = name;
  if (email) feedback.email = email;
  if (message) feedback.message = message;
  if (rating !== undefined) feedback.rating = rating;
  if (typeof isPublished === "boolean") feedback.isPublished = isPublished;
  if (typeof isActive === "boolean") feedback.isActive = isActive;

  await feedback.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Feedback aktualisiert."
        : req.locale === "tr"
        ? "Geri bildirim güncellendi."
        : "Feedback updated.",
    feedback,
  });
});

// 🌍 Yayınlanmış geri bildirimleri getir (public)
export const getPublishedFeedbacks = asyncHandler(async (_req: Request, res: Response) => {
  const feedbacks = await Feedback.find({ isPublished: true, isActive: true }).sort({ createdAt: -1 });
  res.status(200).json(feedbacks);
});

// ❌ Soft delete (isActive: false)
export const softDeleteFeedback = asyncHandler(async (req: Request, res: Response) => {
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
          ? "Feedback wurde nicht gefunden."
          : req.locale === "tr"
          ? "Geri bildirim bulunamadı."
          : "Feedback not found.",
    });
    return;
  }

  feedback.isActive = false;
  await feedback.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Feedback archiviert."
        : req.locale === "tr"
        ? "Geri bildirim arşivlendi."
        : "Feedback archived.",
  });
});



