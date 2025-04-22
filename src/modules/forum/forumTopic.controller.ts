import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumTopic from "./forumTopic.models";

// ➕ Yeni başlık
export const createTopic = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, category } = req.body;
  const language = req.locale || "en";

  if (!title || !content || !category) {
    res.status(400).json({ message: "Required fields are missing." });
    return;
  }

  const topic = await ForumTopic.create({
    title,
    content,
    category,
    language,
    user: req.user?.id,
  });

  res.status(201).json(topic);
});

// 📄 Kategoriye göre başlıkları getir
export const getTopicsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const topics = await ForumTopic.find({ category: categoryId }).sort({ createdAt: -1 });
  res.status(200).json(topics);
});
