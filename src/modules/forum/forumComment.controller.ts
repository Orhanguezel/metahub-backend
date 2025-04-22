import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumComment from "./forumComment.models";

// ➕ Yeni yorum
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const { content, topic, parentId } = req.body;
  const language = req.locale || "en";

  if (!content || !topic) {
    res.status(400).json({ message: "Content and topic are required." });
    return;
  }

  const comment = await ForumComment.create({
    content,
    topic,
    parentId,
    user: req.user?.id,
    language,
  });

  res.status(201).json(comment);
});

// 📄 Bir başlığa ait yorumları getir
export const getCommentsByTopic = asyncHandler(async (req: Request, res: Response) => {
  const { topicId } = req.params;

  const comments = await ForumComment.find({
    topic: topicId,
    isPublished: true,
    isActive: true,
  }).sort({ createdAt: 1 });

  res.status(200).json(comments);
});
