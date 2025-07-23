import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ALLOWED_COMMENT_CONTENT_TYPES, ALLOWED_COMMENT_TYPES, CommentContentType } from "@/core/utils/constants";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { IComment, CommentType } from "./types";

// --- Yardımcılar
const normalizeContentType = (type: string): CommentContentType =>
  type.toLowerCase() as CommentContentType;

// --- Yorum oluştur ---
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const {
    comment,
    contentType,
    contentId,
    label,
    text,
    type = "comment",
    name,
    email,
    rating,
  } = req.body;
  const user = req.user;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const normalizedType = contentType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);
    const finalType: CommentType = (type || "comment").toLowerCase();

    const { Comment, Notification } = await getTenantModels(req);

    if (!user && (!name || !email)) {
      res.status(400).json({
        success: false,
        message: t("comment.nameEmailRequired"),
      });return;
    }

    if (!ALLOWED_COMMENT_CONTENT_TYPES.includes(finalContentType)) {
      logger.withReq.info(req, t("comment.invalidContentType", { contentType: finalContentType }));
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentType", { contentType: finalContentType }),
      });return;
    }

    if (!ALLOWED_COMMENT_TYPES.includes(finalType)) {
      res.status(400).json({
        success: false,
        message: t("comment.invalidType", { type: finalType }),
      });return;
    }

    if (!isValidObjectId(contentId)) {
      logger.withReq.info(req, t("comment.invalidContentId", { contentId }));
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentId", { contentId }),
      });return;
    }

    const newComment = await Comment.create({
      name: user?.name || name,
      tenant: req.tenant,
      email: user?.email || email,
      userId: user?._id,
      label: label || comment,
      text: text || comment,
      contentType: finalContentType,
      contentId,
      type: finalType,
      rating: typeof rating === "number" ? rating : undefined,
      isPublished: false,
      isActive: true,
    });

    // Bildirim
    await Notification.create({
      tenant: req.tenant,
      type: "info",
      user: user?._id || null,
      message: t("comment.notification.created", { contentType: finalContentType }),
      data: {
        commentId: newComment._id,
        contentId,
        contentType: finalContentType,
        preview: (label || comment || "").slice(0, 80),
        name: user?.name || name,
        email: user?.email || email,
      },
      isActive: true,
      isRead: false,
      createdAt: new Date(),
    });

    logger.withReq.info(req, t("comment.submitted"));

    res.status(201).json({
      success: true,
      message: t("comment.submitted"),
      data: newComment,
    });return;
  } catch (err: any) {
    logger.withReq.error(req, "Comment create error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.createError", { error: err.message }),
    });return;
  }
});

// --- İçeriğe ait yorumları çek (filtreli: sadece yayınlanmış) ---
export const getCommentsForContent = asyncHandler(async (req: Request, res: Response) => {
  const { type: rawType, id } = req.params;
  const commentType = req.query.type as CommentType | undefined; // opsiyonel filter param
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const normalizedType = rawType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);
    const { Comment } = await getTenantModels(req);

    if (!ALLOWED_COMMENT_CONTENT_TYPES.includes(finalContentType)) {
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentType", { contentType: finalContentType }),
      });return;
    }
    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentId", { contentId: id }),
      });return;
    }

    const filter: any = {
      tenant: req.tenant,
      contentType: finalContentType,
      contentId: id,
      isPublished: true,
      isActive: true,
    };
    if (commentType && ALLOWED_COMMENT_TYPES.includes(commentType)) {
      filter.type = commentType;
    }

    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: t("comment.listFetched"),
      data: comments,
    });
  } catch (err: any) {
    logger.withReq.error(req, "Get comments error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.listFetchError", { error: err.message }),
    });
  }
});

// --- Admin: Tüm yorumlar (sayfalı + type filter) ---
export const getAllComments = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Comment } = await getTenantModels(req);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const commentType = req.query.type as CommentType | undefined;
    const query: any = { isActive: true, tenant: req.tenant };
    if (commentType && ALLOWED_COMMENT_TYPES.includes(commentType)) {
      query.type = commentType;
    }

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
      message: t("comment.paginatedFetched"),
      data: comments,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err: any) {
    logger.withReq.error(req, "Admin getAllComments error", { error: err.message, stack: err.stack });
  res.status(500).json({
      success: false,
      message: t("comment.paginatedFetchError", { error: err.message }),
    });
  }
});

// --- Admin: Yayınlama togglesı ---
export const togglePublishComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Comment } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("comment.invalidId") });
      return;
    }

    const comment = await Comment.findOne({ _id: id, tenant: req.tenant });
    if (!comment) {
      res.status(404).json({ success: false, message: t("comment.notFound") });
      return;
    }

    comment.isPublished = !comment.isPublished;
    await comment.save();

    res.status(200).json({
      success: true,
      message: t("comment.togglePublished", { published: comment.isPublished }),
      data: comment,
    });
  } catch (err: any) {
    logger.withReq.error(req, "Admin togglePublishComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.toggleError", { error: err.message }),
    });
  }
});

// --- Admin: Yorum sil (soft delete) ---
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("comment.invalidId") });
      return;
    }

    const { Comment } = await getTenantModels(req);
    const comment = await Comment.findOne({ _id: id, tenant: req.tenant });
    if (!comment) {
      res.status(404).json({ success: false, message: t("comment.notFound") });
      return;
    }

    comment.isActive = false;
    await comment.save();

    res.status(200).json({
      success: true,
      message: t("comment.deleted"),
    });
  } catch (err: any) {
    logger.withReq.error(req, "Admin deleteComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.deleteError", { error: err.message }),
    });
  }
});

// --- Admin: Çok dilli admin reply ekle/güncelle ---
export const replyToComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { id } = req.params;
    const { text } = req.body; // { tr: "...", en: "...", de: "...", ... }
    const { Comment } = await getTenantModels(req);

    const comment = await Comment.findOne({ _id: id, tenant: req.tenant });
    if (!comment) {
      res.status(404).json({ success: false, message: t("comment.notFound") });
      return;
    }

    comment.reply = comment.reply || { text: fillAllLocales(""), createdAt: new Date().toISOString() };
    for (const lng of SUPPORTED_LOCALES) {
      if (typeof text?.[lng] === "string") {
        comment.reply.text[lng] = text[lng];
      }
    }
    comment.reply.createdAt = new Date().toISOString();
    await comment.save();

    res.status(200).json({
      success: true,
      message: t("comment.replyAdded"),
      data: comment,
    });
  } catch (err: any) {
    logger.withReq.error(req, "Admin replyToComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.replyError", { error: err.message }),
    });
  }
});
