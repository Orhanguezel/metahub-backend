import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ALLOWED_COMMENT_CONTENT_TYPES, CommentContentType } from "@/core/utils/constants";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

// --- Yardımcılar
const normalizeContentType = (type: string): CommentContentType => {
  const normalized = type.toLowerCase();
  return (normalized.charAt(0).toUpperCase() + normalized.slice(1)) as CommentContentType;
};

// --- Yorum oluştur
// --- Yorum oluştur (Notification eklenmiş ve response optimize)
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const { comment, contentType, contentId, label, text } = req.body;
  const user = req.user;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const normalizedType = contentType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);
    const { Comment, Notification } = await getTenantModels(req);

    if (!user && (!req.body.name || !req.body.email)) {
      res.status(400).json({
        success: false,
        message: t("comment.nameEmailRequired"),
      });
      return;
    }

    if (!ALLOWED_COMMENT_CONTENT_TYPES.includes(finalContentType)) {
      logger.withReq.info(req, t("comment.invalidContentType", { contentType: finalContentType }));
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentType", { contentType: finalContentType }),
      });
      return;
    }

    if (!isValidObjectId(contentId)) {
      logger.withReq.info(req, t("comment.invalidContentId", { contentId }));
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentId", { contentId }),
      });
      return;
    }

    const newComment = await Comment.create({
      name: user?.name || req.body.name,
      tenant: req.tenant,
      email: user?.email || req.body.email,
      userId: user?._id,
      label: label || comment,   // formdan gelen başlık veya yorum
      text: text || comment,     // formdan gelen içerik veya yorum
      contentType: finalContentType,
      contentId,
      isPublished: false,
      isActive: true,
    });

    // --- Yorum bildirimi (admin/moderator için)
    await Notification.create({
      tenant: req.tenant,
      type: "info",
      user: user?._id || null, // guest ise null, admin panelde gösterim için
      message: t("comment.notification.created", { contentType: finalContentType }),
      data: {
        commentId: newComment._id,
        contentId,
        contentType: finalContentType,
        preview: (label || comment || "").slice(0, 80),
        name: user?.name || req.body.name,
        email: user?.email || req.body.email,
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
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Comment create error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.createError", { error: err.message }),
    });
    return;
  }
});


// --- İçeriğe ait yorumları çek (sadece yayınlanmış)
export const getCommentsForContent = asyncHandler(async (req: Request, res: Response) => {
  const { type: rawType, id } = req.params;
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
      });
      return;
    }
    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentId", { contentId: id }),
      });
      return;
    }

    const comments = await Comment.find({
      tenant: req.tenant,
      contentType: finalContentType,
      contentId: id,
      isPublished: true,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: t("comment.listFetched"),
      data: comments,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Get comments error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.listFetchError", { error: err.message }),
    });
    return;
  }
});

// --- Admin: Tüm yorumlar (sayfalı)
export const getAllComments = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Comment } = await getTenantModels(req);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const query = { isActive: true, tenant: req.tenant };

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
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Admin getAllComments error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.paginatedFetchError", { error: err.message }),
    });
    return;
  }
});

// --- Admin: Yayınlama togglesı
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
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Admin togglePublishComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.toggleError", { error: err.message }),
    });
    return;
  }
});

// --- Admin: Yorum sil (soft delete)
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
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Admin deleteComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.deleteError", { error: err.message }),
    });
    return;
  }
});

// --- Admin: Çok dilli admin reply ekle/güncelle
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
    return;
  } catch (err: any) {
    logger.withReq.error(req, "Admin replyToComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.replyError", { error: err.message }),
    });
    return;
  }
});
