import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {ForumTopic} from "../forum";
import { isValidObjectId } from "@/core/utils/validation";

// ➕ Create new topic
export const createTopic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, content, category } = req.body;

  if (!title?.en || !content?.en || !category) {
    res.status(400).json({
      success: false,
      message: "Title (English), content (English), and category ID are required.",
    });
    return;
  }

  if (!isValidObjectId(category)) {
    res.status(400).json({
      success: false,
      message: "Invalid category ID.",
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
    message: "Topic created successfully.",
    data: topic,
  });
});

// 📄 Get topics by category
export const getTopicsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categoryId } = req.params;

  if (!isValidObjectId(categoryId)) {
    res.status(400).json({
      success: false,
      message: "Invalid category ID.",
    });
    return;
  }

  const topics = await ForumTopic.find({ category: categoryId })
    .sort({ createdAt: -1 })
    .populate("user", "name email");

  res.status(200).json({
    success: true,
    message: "Topics fetched successfully.",
    data: topics,
  });
});
