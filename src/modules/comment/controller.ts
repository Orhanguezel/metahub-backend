import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {
  ALLOWED_COMMENT_CONTENT_TYPES,
  ALLOWED_COMMENT_TYPES,
  ALLOWED_COMMENT_CONTENT_TYPES_LOWER,
} from "@/core/utils/constants";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

// ⬇️ TIPLERİ BURADAN AL (global dahil)
import type { IComment, CommentType, CommentContentType } from "./types";

import mongoose from "mongoose";

/* -------------------------------- utils -------------------------------- */
const normalizeContentType = (v: unknown): CommentContentType =>
  String(v || "").toLowerCase() as CommentContentType;

const normalizeInt = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};

/* =============================================================================
 * POST /comment  — Yorum/Testimonial oluştur
 * ========================================================================== */
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const {
    comment,
    contentType,
    contentId,
    label,
    text,
    type = "comment",
    name,
    profileImage,
    email,
    rating,
  } = req.body;

  const user = req.user as any;
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    // ---- ZORUNLU: tenant header kontrolü ----
    if (!req.tenant) {
      res.status(400).json({ success: false, message: "tenant.required" });
      return;
    }

    const finalType = (type || "comment").toLowerCase() as CommentType;

    // ⬇️ Tipi geniş tut (global dahil)
    let finalContentType: CommentContentType = normalizeContentType(contentType);

    // Guest -> name/email zorunlu
    if (!user && (!name || !email)) {
      res.status(400).json({ success: false, message: t("comment.nameEmailRequired") });
      return;
    }

    // Testimonial için contentType'ı güvenli şekilde "global" sabitle
    if (finalType === "testimonial") {
      const GLOBAL_CT: CommentContentType = "global";
      finalContentType = GLOBAL_CT;
    }

    // Content type kontrol (global dahil olmalı → constants set’inizde 'global' olduğundan emin olun)
    if (!ALLOWED_COMMENT_CONTENT_TYPES_LOWER.has(finalContentType)) {
      logger.withReq.info(req, t("comment.invalidContentType", { contentType: finalContentType }));
      res.status(400).json({
        success: false,
        message: t("comment.invalidContentType", { contentType: finalContentType }),
      });
      return;
    }

    // Tenant modellerini tek sefer çek
    const modelsAny = await getTenantModels(req);
    const { Comment } = modelsAny as any;

    // ✅ testimonial değilse içerik doğrulaması
    if (finalType !== "testimonial") {
      if (!isValidObjectId(contentId)) {
        logger.withReq.info(req, t("comment.invalidContentId", { contentId }));
        res.status(400).json({ success: false, message: t("comment.invalidContentId", { contentId }) });
        return;
      }

      // 1) Modeli TENANT bağlamından çöz: modelsAny > mongoose.models
      const allTenantModels = modelsAny as any;
      const allGlobalModels = mongoose.models as any;

      // case-insensitive arama
      const pickByName = (bag: any, name: string) => {
        const entry = Object.entries(bag).find(([k]) => k.toLowerCase() === name);
        return entry?.[1];
      };

      let contentModel: mongoose.Model<any> | undefined =
        pickByName(allTenantModels, finalContentType) ||
        (finalContentType === "menuitem" ? allTenantModels.MenuItem : undefined) ||
        pickByName(allGlobalModels, finalContentType) ||
        (finalContentType === "menuitem" ? allGlobalModels.MenuItem : undefined);

      if (!contentModel) {
        res.status(400).json({
          success: false,
          message: t("comment.invalidContentType", { contentType: finalContentType }),
        });
        return;
      }

      // 2) Dinamik exists filtresi
      const existsFilter: any = { _id: contentId };
      const tenantPath =
        contentModel.schema.path("tenant") || contentModel.schema.path("tenantId");

      if (tenantPath) {
        const pathName = (tenantPath as any).path as string;

        const isObjId =
          (tenantPath as any).instance === "ObjectId" ||
          (tenantPath as any).options?.type === mongoose.Schema.Types.ObjectId;

        if (isObjId) {
          const rawTid = (req as any).tenantId || (req as any).tenant;
          try {
            existsFilter[pathName] = new mongoose.Types.ObjectId(String(rawTid));
          } catch {
            logger.withReq.warn(req, "comment_exists_filter_tenant_cast_failed", { rawTid });
          }
        } else {
          existsFilter[pathName] = req.tenant;
        }
      } else {
        logger.withReq.debug(req, "comment_exists_no_tenant_field_on_content", {
          model: contentModel.modelName,
          contentType: finalContentType,
        });
      }

      if (contentModel.schema.path("isActive")) existsFilter.isActive = true;
      if (contentModel.schema.path("isPublished")) existsFilter.isPublished = true;

      const exists = await contentModel.exists(existsFilter);

      if (!exists) {
        logger.withReq.info(req, "comment_content_not_found", {
          tenant: req.tenant,
          contentType: finalContentType,
          contentId,
          existsFilter,
          model: contentModel.modelName,
        });
        res.status(404).json({ success: false, message: t("comment.contentNotFound") });
        return;
      }
    }

    // rating (1..5 int) güvenli parse
    const r = rating != null ? Number(rating) : undefined;
    const safeRating =
      Number.isFinite(r) && Math.trunc(r as number) === r && (r as number) >= 1 && (r as number) <= 5
        ? (r as number)
        : undefined;

    const newComment = await Comment.create({
      name: user?.name || name,
      profileImage,
      tenant: req.tenant,
      email: user?.email || email,
      userId: user?._id || undefined,
      label: label || comment,
      text: text || comment,
      contentType: finalContentType,
      ...(finalType !== "testimonial" && contentId ? { contentId } : {}),
      type: finalType,
      rating: safeRating,
      isPublished: false,
      isActive: true,
    });

    // ---- Bildirim (dedupe) ----
    const title: Record<SupportedLocale, string> = {} as any;
    const message: Record<SupportedLocale, string> = {} as any;
    for (const lng of SUPPORTED_LOCALES) {
      const tLang = (key: string, params?: any) => translate(key, lng, translations, params);
      title[lng] = tLang("comment.notification.title");
      message[lng] = tLang("comment.notification.created", { contentType: finalContentType });
    }

    const preview = (label || comment || text || "").slice(0, 80);
    const source = { module: "comment", entity: finalContentType, refId: newComment._id, event: "comment.created" };
    const target = { roles: ["admin", "moderator"] };

    const contentKey = finalType === "testimonial" ? "global" : (contentId ? String(contentId) : "unknown");
    const dedupeWindowMin = 5;
    const actorKey = (user?._id || email || "guest").toString();
    const dedupeKey = `${req.tenant}:${finalContentType}:${contentKey}:comment:${actorKey}`;
    const since = new Date(Date.now() - dedupeWindowMin * 60 * 1000);

    const existing = await (modelsAny as any).Notification.findOne({
      tenant: req.tenant,
      dedupeKey,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (!existing) {
      await (modelsAny as any).Notification.create({
        tenant: req.tenant,
        type: "info",
        title,
        message,
        user: user?._id || null,
        target,
        channels: ["inapp"],
        data: {
          commentId: newComment._id,
          contentId: finalType === "testimonial" ? null : contentId,
          contentType: finalContentType,
          preview,
          name: user?.name || name,
          email: user?.email || email,
        },
        priority: 3,
        source,
        tags: ["comment", "moderation", finalContentType],
        dedupeKey,
        dedupeWindowMin,
        isActive: true,
        link: {
          routeName: "admin.comments",
          params: { id: String(newComment._id) },
        },
      });
    } else {
      logger.withReq.info(req, "notification_deduped_comment", { tenant: req.tenant, dedupeKey, windowMin: dedupeWindowMin });
    }

    logger.withReq.info(req, t("comment.submitted"));
    res.status(201).json({ success: true, message: t("comment.submitted"), data: newComment });
  } catch (err: any) {
    logger.withReq.error(req, "Comment create error", { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: t("comment.createError", { error: err.message }) });
  }
});

/* =============================================================================
 * GET /comment/:type/:id — İçeriğe ait yayınlanmış yorumlar (public)
 * ========================================================================== */
export const getCommentsForContent = asyncHandler(async (req: Request, res: Response) => {
  const { type: rawType, id } = req.params;
  const commentType = req.query.type as CommentType | undefined;

  const page = Math.max(normalizeInt(req.query.page, 1), 1);
  const limit = Math.min(Math.max(normalizeInt(req.query.limit, 50), 1), 200);

  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const normalizedType = rawType?.toLowerCase();
    const finalContentType = normalizeContentType(normalizedType);
    const { Comment } = await getTenantModels(req);

    if (!ALLOWED_COMMENT_CONTENT_TYPES_LOWER.has(finalContentType)) {
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

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Comment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: t("comment.listFetched"),
      data: comments,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err: any) {
    logger.withReq.error(req, "Get comments error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.listFetchError", { error: err.message }),
    });
  }
});

/* =============================================================================
 * GET /comment (admin) — Sayfalı tüm yorumlar (+ arama)
 * ========================================================================== */
export const getAllComments = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Comment } = await getTenantModels(req);
    const page = Math.max(normalizeInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeInt(req.query.limit, 10), 1), 200);
    const commentType = req.query.type as CommentType | undefined;
    const q = String(req.query.q || "").trim();

    const query: any = { isActive: true, tenant: req.tenant };
    if (commentType && ALLOWED_COMMENT_TYPES.includes(commentType)) {
      query.type = commentType;
    }
    if (q) {
      query.$or = [
        { text: { $regex: q, $options: "i" } },
        { label: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [total, commentsRaw] = await Promise.all([
      Comment.countDocuments(query),
      Comment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name email profileImage")
        .lean<IComment[]>(),
    ]);

    // İçerik populate — tip bazlı select
    const selectMap: Record<string, string> = {
      menuitem: "code slug name images",
      default: "title slug name code",
    };

    await Promise.all(
      commentsRaw.map(async (c) => {
        if (
          c?.contentId &&
          typeof c.contentId === "string" &&
          mongoose.Types.ObjectId.isValid(c.contentId) &&
          c.type !== "testimonial"
        ) {
          const modelKey = String(c.contentType);
          const ContentModel = mongoose.models[modelKey];
          if (ContentModel) {
            try {
              const select = selectMap[modelKey] || selectMap.default;
              const content = await (ContentModel as any).findById(c.contentId).select(select).lean();
              if (content) {
                // @ts-ignore — admin listesinde referans objeyi dönmek işlevsel
                c.contentId = content;
              }
            } catch {
              /* ignore */
            }
          }
        }
      })
    );

    res.status(200).json({
      success: true,
      message: t("comment.paginatedFetched"),
      data: commentsRaw,
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

/* =============================================================================
 * PUT /comment/:id/toggle — Yayın durumu değiştir
 * ========================================================================== */
export const togglePublishComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
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

/* =============================================================================
 * DELETE /comment/:id — Soft delete
 * ========================================================================== */
/* =============================================================================
 * DELETE /comment/:id — Hard delete
 * ========================================================================== */
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: t("comment.invalidId") });
      return;
    }

    // Tenant modelleri
    const modelsAny = await getTenantModels(req);
    const { Comment } = modelsAny as any;

    // önce var mı kontrol et
    const existing = await Comment.findOne({ _id: id, tenant: req.tenant }).lean();
    if (!existing) {
      res.status(404).json({ success: false, message: t("comment.notFound") });
      return;
    }

    // 1) Yorumu kalıcı olarak sil
    await Comment.deleteOne({ _id: id, tenant: req.tenant });

    // 2) (Opsiyonel) İlgili bildirimleri temizle
    //    Notification tenant model'iniz varsa, aşağısı güvenli şekilde dener.
    try {
      const Notification = (modelsAny as any).Notification;
      if (Notification) {
        await Notification.deleteMany({
          tenant: req.tenant,
          "data.commentId": id,
        });
      }
    } catch (_) {
      /* bildirim modeli yoksa/erişilemiyorsa sessiz geç */
    }

    res.status(200).json({
      success: true,
      message: t("comment.deleted"), // i18n: “Silindi.”
      data: { _id: id, hardDeleted: true },
    });
  } catch (err: any) {
    logger.withReq.error(req, "Admin hard deleteComment error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.deleteError", { error: err.message }),
    });
  }
});


/* =============================================================================
 * PUT /comment/:id/reply — Çok dilli admin reply ekle/güncelle
 * ========================================================================== */
export const replyToComment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { id } = req.params;
    const { text } = req.body as { text: Partial<Record<SupportedLocale, string>> };
    const { Comment } = await getTenantModels(req);

    const comment = await Comment.findOne({ _id: id, tenant: req.tenant });
    if (!comment) {
      res.status(404).json({ success: false, message: t("comment.notFound") });
      return;
    }

    comment.reply = comment.reply || { text: fillAllLocales(""), createdAt: new Date().toISOString() };
    for (const lng of SUPPORTED_LOCALES) {
      if (typeof text?.[lng] === "string") {
        // @ts-ignore i18n alan set
        comment.reply.text[lng] = text[lng]!;
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

/* =============================================================================
 * GET /comment/testimonials — Public testimonial listesi
 * ========================================================================== */
export const getTestimonialsPublic = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page ?? 1) | 0, 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20) | 0, 1), 100);
  const minRatingRaw = req.query.minRating;
  const minRating =
    minRatingRaw != null && Number.isFinite(Number(minRatingRaw))
      ? Math.max(Math.min(Number(minRatingRaw), 5), 1)
      : undefined;

  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Comment } = await getTenantModels(req);

    const filter: any = {
      tenant: req.tenant,
      type: "testimonial",
      isPublished: true,
      isActive: true,
      contentType: "global",
    };
    if (minRating) filter.rating = { $gte: minRating };

    const [items, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("_id name profileImage label text rating createdAt")
        .lean(),
      Comment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: t("comment.listFetched"),
      data: items,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err: any) {
    logger.withReq.error(req, "Get testimonials public error", { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      message: t("comment.listFetchError", { error: err.message }),
    });
  }
});


// ... mevcut importlar ve yardımcılar

// İçerik için minimal select alanları
const selectMap: Record<string, string> = {
  product: "title slug name code images thumbnail",
  menuitem: "code slug name images",
  default: "title slug name code images",
};

/* =============================================================================
 * GET /comment/user/me — Auth kullanıcının yorumları (public/auth required)
 * ========================================================================== */
export const getMyComments = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    // 1) Tenant guard
    if (!req.tenant) {
      res.status(400).json({ success: false, message: "tenant.required" });return; 
    }

    // 2) Auth guard
    const user = req.user as any;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "unauthorized" });return;
    }

    const { Comment } = await getTenantModels(req);

    const page = Math.max(normalizeInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeInt(req.query.limit, 10), 1), 100);
    const commentType = (req.query.type as CommentType | undefined) || undefined;
    const includeGuest = String(req.query.includeGuest || "").toLowerCase() === "true" || req.query.includeGuest === "1";

    // 3) Esas filtre
    const filter: any = {
      tenant: req.tenant,
      isActive: true,
      // kendi yorumunu görürken publish aramıyoruz
    };

    // userId zorunlu; includeGuest true ise email fallback de ekle
    if (includeGuest && user.email) {
      filter.$or = [
        { userId: user._id },
        { userId: { $exists: false }, email: user.email },
      ];
    } else {
      filter.userId = user._id;
    }

    if (commentType && ALLOWED_COMMENT_TYPES.includes(commentType)) {
      filter.type = commentType;
    }

    const [total, rows] = await Promise.all([
      Comment.countDocuments(filter),
      Comment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IComment[]>(),
    ]);

    // 4) İçerik dökümü (product görselleri vs.)
    const isValid = (v: any) => mongoose.Types.ObjectId.isValid(String(v));

    await Promise.all(
      rows.map(async (c) => {
        if (c?.contentId && c.type !== "testimonial" && isValid(c.contentId)) {
          const key = String(c.contentType).toLowerCase();
          const Model =
            mongoose.models[key] || (key === "menuitem" ? mongoose.models.MenuItem : undefined);

          if (Model) {
            try {
              const sel = selectMap[key] || selectMap.default;
              const idStr = String(c.contentId);
              const content = await (Model as any).findById(idStr).select(sel).lean();

              if (content) {
                if (key === "product") (c as any).product = content;
                // @ts-ignore
                c.contentId = content;
              }
            } catch { /* ignore */ }
          }
        }
      })
    );

     res.status(200).json({
      success: true,
      message: t("comment.paginatedFetched"),
      data: rows,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
   
 return;
  } catch (err: any) {
    logger.withReq.error(req, "Get my comments error", { error: err.message, stack: err.stack });
     res.status(500).json({
      success: false,
      message: t("comment.paginatedFetchError", { error: err.message }),
    });
    return;
  }
});
