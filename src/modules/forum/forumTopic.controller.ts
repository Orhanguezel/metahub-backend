import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumTopic from "./forumTopic.models";
import { isValidObjectId } from "@/core/utils/validation";

// ➕ Yeni başlık oluştur
export const createTopic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, content, category } = req.body;
  const locale = req.locale || "en";

  if (!title || !content || !category) {
    res.status(400).json({
      success: false,
      message:
        locale === "de"
          ? "Pflichtfelder fehlen."
          : locale === "tr"
          ? "Zorunlu alanlar eksik."
          : "Required fields are missing.",
    });
    return;
  }

  if (!isValidObjectId(category)) {
    res.status(400).json({
      success: false,
      message:
        locale === "de"
          ? "Ungültige Kategorie-ID."
          : locale === "tr"
          ? "Geçersiz kategori ID'si."
          : "Invalid category ID.",
    });
    return;
  }

  const topic = await ForumTopic.create({
    title,
    content,
    category,
    user: req.user?.id,
  });

  res.status(201).json({
    success: true,
    message:
      locale === "de"
        ? "Thema erfolgreich erstellt."
        : locale === "tr"
        ? "Başlık başarıyla oluşturuldu."
        : "Topic created successfully.",
    topic,
  });
});

// 📄 Kategoriye göre başlıkları getir
export const getTopicsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categoryId } = req.params;
  const locale = req.locale || "en";

  if (!isValidObjectId(categoryId)) {
    res.status(400).json({
      success: false,
      message:
        locale === "de"
          ? "Ungültige Kategorie-ID."
          : locale === "tr"
          ? "Geçersiz kategori ID'si."
          : "Invalid category ID.",
    });
    return;
  }

  const topics = await ForumTopic.find({ category: categoryId })
    .sort({ createdAt: -1 })
    .populate("user", "name email");

  res.status(200).json({
    success: true,
    message:
      locale === "de"
        ? "Themen erfolgreich geladen."
        : locale === "tr"
        ? "Başlıklar başarıyla yüklendi."
        : "Topics fetched successfully.",
    topics,
  });
});
