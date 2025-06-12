import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Comment } from "@/modules/comment";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  CommentContentType,
} from "@/core/utils/constants";
import { isValidObjectId } from "@/core/utils/validation";
import "@/modules/product";
import "@/modules/ensotekprod";
import "@/modules/bikes";
import "@/modules/blog";
import "@/modules/services";
import "@/modules/news";
import "@/modules/articles";
import "@/modules/activity";

// 🔧 Küçük harf → Büyük harf dönüşüm
const normalizeContentType = (type: string): CommentContentType => {
  const normalized = type.toLowerCase();
  return (normalized.charAt(0).toUpperCase() +
    normalized.slice(1)) as CommentContentType;
};

// ✅ Public - Create new comment
export const createComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { comment, contentType, contentId } = req.body;
    const user = req.user;

    const normalizedType = contentType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);

    if (!user && (!req.body.name || !req.body.email)) {
      res.status(400).json({
        success: false,
        message: "Name and email are required for guest users.",
      });
      return;
    }

    if (!ALLOWED_COMMENT_CONTENT_TYPES.includes(finalContentType)) {
      res.status(400).json({
        success: false,
        message: "Invalid content type.",
      });
      return;
    }

    if (!isValidObjectId(contentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid content ID.",
      });
      return;
    }

    const newComment = await Comment.create({
      name: user?.name || req.body.name,
      email: user?.email || req.body.email,
      userId: user?._id,
      label: {
        tr: comment,
        en: comment,
        de: comment,
      },
      contentType: finalContentType,
      contentId,
      isPublished: false,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Comment submitted successfully. Awaiting moderation.",
      data: newComment,
    });
  }
);

// ✅ Public - Get comments by contentId + type (only published)
export const getCommentsForContent = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type: rawType, id } = req.params;
    const normalizedType = rawType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);

    if (!ALLOWED_COMMENT_CONTENT_TYPES.includes(finalContentType)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid content type." });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid content ID." });
      return;
    }

    const comments = await Comment.find({
      contentType: finalContentType,
      contentId: id,
      isPublished: true,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Published comments fetched successfully.",
      data: comments,
    });
  }
);

// ✅ Admin - Get all comments with pagination
export const getAllComments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;

    const query = { isActive: true };

    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email")
      .populate("contentId", "title slug")
      .lean();

    res.status(200).json({
      success: true,
      message: "Paginated comments fetched successfully.",
      data: comments,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  }
);

// ✅ Admin - Toggle publish/unpublish comment
export const togglePublishComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid comment ID." });
      return;
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ success: false, message: "Comment not found." });
      return;
    }

    comment.isPublished = !comment.isPublished;
    await comment.save();

    res.status(200).json({
      success: true,
      message: `Comment successfully ${
        comment.isPublished ? "published" : "unpublished"
      }.`,
      data: comment,
    });
  }
);

// ✅ Admin - Soft delete comment
export const deleteComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid comment ID." });
      return;
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ success: false, message: "Comment not found." });
      return;
    }

    comment.isActive = false;
    await comment.save();

    res.status(200).json({
      success: true,
      message: "Comment archived (soft deleted) successfully.",
    });
  }
);

// ✅ Admin - Add or update reply to a comment
export const replyToComment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { text } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ success: false, message: "Comment not found." });
      return;
    }

    if (!comment.reply) {
      comment.reply = {
        text,
        createdAt: new Date(),
      };
    } else {
      comment.reply.text = text;
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: "Reply added or updated successfully.",
      data: comment,
    });
  }
);
