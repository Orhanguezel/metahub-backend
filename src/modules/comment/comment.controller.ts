import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Comment } from "@/modules/comment";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create new comment (public)
export const createComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, comment, contentType, contentId } = req.body;

  const newComment = await Comment.create({
    name,
    email,
    label: { tr: comment, en: comment, de: comment },
    contentType,
    contentId,
    isPublished: false,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Comment submitted successfully. Awaiting review.",
    data: newComment,
  });
});

// ✅ Admin - Get all comments
export const getAllComments = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const comments = await Comment.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "Comments fetched successfully.",
    data: comments,
  });
});

// ✅ Public - Get comments by content (only published)
export const getCommentsForContent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, id } = req.params;

  if (!["blog", "product", "service"].includes(type)) {
    res.status(400).json({ success: false, message: "Invalid content type." });
    return;
  }

  const comments = await Comment.find({
    contentType: type,
    contentId: id,
    isPublished: true,
    isActive: true,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Comments fetched successfully.",
    data: comments,
  });
});

// ✅ Admin - Toggle publish/unpublish comment
export const togglePublishComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const comment = await Comment.findById(id);
  if (!comment) {
    res.status(404).json({ success: false, message: "Comment not found." });
    return;
  }

  comment.isPublished = !comment.isPublished;
  await comment.save();

  res.status(200).json({
    success: true,
    message: `Comment ${comment.isPublished ? "published" : "unpublished"} successfully.`,
    data: comment,
  });
});

// ✅ Admin - Soft delete comment
export const deleteComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const comment = await Comment.findById(id);
  if (!comment) {
    res.status(404).json({ success: false, message: "Comment not found." });
    return;
  }

  comment.isActive = false;
  await comment.save();

  res.status(200).json({
    success: true,
    message: "Comment archived successfully.",
  });
});
