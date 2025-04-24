import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumComment from "./forumComment.models";

// ➕ Yeni yorum oluştur
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const { content, topic, parentId } = req.body;
  const language = req.locale || "en";

  if (!content?.[language] || !topic) {
    res.status(400).json({
      success: false,
      message:
        language === "de"
          ? "Inhalt und Thema sind erforderlich."
          : language === "tr"
          ? "İçerik ve konu zorunludur."
          : "Content and topic are required.",
    });
    return;
  }

  const comment = await ForumComment.create({
    content,
    topic,
    parentId: parentId || null,
    user: req.user?.id,
    isPublished: true,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message:
      language === "de"
        ? "Kommentar erfolgreich erstellt."
        : language === "tr"
        ? "Yorum başarıyla oluşturuldu."
        : "Comment created successfully.",
    comment,
  });
});

// 📄 Başlığa ait yorumları getir
export const getCommentsByTopic = asyncHandler(async (req: Request, res: Response) => {
  const { topicId } = req.params;
  const language = req.locale || "en";

  const comments = await ForumComment.find({
    topic: topicId,
    isPublished: true,
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .populate("user", "name"); // Kullanıcı ismi gibi bir alan varsa göster

  res.status(200).json({
    success: true,
    message:
      language === "de"
        ? "Kommentare erfolgreich geladen."
        : language === "tr"
        ? "Yorumlar başarıyla yüklendi."
        : "Comments fetched successfully.",
    comments,
  });
});
