import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {ForumComment} from "../forum";

// ➕ Create new comment
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const { content, topic, parentId } = req.body;

  if (!content?.en || !topic) {
    res.status(400).json({
      success: false,
      message: "Content (English) and topic ID are required.",
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
    message: "Comment created successfully.",
    data: comment,
  });
});

// 📄 Get comments by topic
export const getCommentsByTopic = asyncHandler(async (req: Request, res: Response) => {
  const { topicId } = req.params;

  const comments = await ForumComment.find({
    topic: topicId,
    isPublished: true,
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .populate("user", "name");

  res.status(200).json({
    success: true,
    message: "Comments fetched successfully.",
    data: comments,
  });
});
