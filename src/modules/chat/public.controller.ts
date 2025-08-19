import asyncHandler from "express-async-handler";
import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale } from "@/types/common";

function getLocaleT(req: Request) {
  const locale = req.locale as SupportedLocale | undefined;
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  return { locale, t };
}

/** 1) Oda mesajlarını getir — pagination + sort */
export const getMessagesByRoom = asyncHandler(async (req, res, next) => {
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { roomId } = req.params;
    const page = Math.max(parseInt(String(req.query.page || 1), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || 20), 10), 1), 100);
    const sort = (String(req.query.sort || "asc").toLowerCase() === "desc") ? -1 : 1;

    const items = await ChatMessage.find({ roomId, tenant: req.tenant })
      .populate("sender", "name email")
      .sort({ createdAt: sort })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, data: items });
  } catch (error) { next(error); }
});

/** 2) Tüm odaların son mesajı (group by roomId) */
export const getAllRoomsLastMessages = asyncHandler(async (req, res, next) => {
  const { ChatMessage } = await getTenantModels(req);
  try {
    const latest = await ChatMessage.aggregate([
      { $match: { tenant: req.tenant } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$roomId", latestMessage: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestMessage" } },
    ]);
    const populated = await ChatMessage.populate(latest, { path: "sender", select: "name email" });
    res.status(200).json({ success: true, data: populated });
  } catch (error) { next(error); }
});

/** 3) Bir odadaki mesajları okundu işaretle (kullanıcı) */
export const markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { roomId } = req.params;
    await ChatMessage.updateMany(
      { roomId, isRead: false, isFromBot: false, tenant: req.tenant },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: t("markAsRead.success") });
  } catch (error) { next(error); }
});

/** 4) Aktif chat sessionları (kullanıcıya açık) */
export const getActiveChatSessions = asyncHandler(async (req, res, next) => {
  const { ChatSession } = await getTenantModels(req);
  try {
    const sessions = await ChatSession.find({ closedAt: { $exists: false }, tenant: req.tenant })
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();
    res.status(200).json({ success: true, data: sessions });
  } catch (error) { next(error); }
});

/** 5) Kullanıcı mesajı gönder */
export const sendUserMessage = asyncHandler(async (req, res, next) => {
  const { ChatMessage, ChatSession } = await getTenantModels(req);
  try {
    const { roomId, message } = req.body || {};
    const userLocale = (req.locale as SupportedLocale) || "en";

    if (!roomId || !message) {
      res.status(400).json({ success: false, message: "chat.errors.missingParams" }); return;
    }

    const newMessage = await ChatMessage.create({
      roomId,
      sender: req.user?.id ?? null,
      tenant: req.tenant,
      message,
      isFromBot: false,
      isFromAdmin: false,
      isRead: false,
      language: fillAllLocales(message, userLocale),
    });

    // Oda yoksa session yarat/koru
    await ChatSession.updateOne(
      { tenant: req.tenant, roomId },
      { $setOnInsert: { tenant: req.tenant, roomId, user: req.user?.id } },
      { upsert: true }
    );

    // Gerçek zamanlı: Socket.IO + SSE
    req.app.get("io")?.to(roomId).emit("chat-message", {
      _id: newMessage.id,
      message: newMessage.message,
      sender: { _id: req.user?.id, name: req.user?.name, email: req.user?.email },
      room: roomId,
      createdAt: newMessage.createdAt,
      isFromAdmin: false,
    });

    const sse = req.app.get("sse");
    sse?.publish?.(req.tenant, String(roomId), { type: "message.created", payload: newMessage.toObject?.() ?? newMessage });

    res.status(201).json({ success: true, message: "chat.send.success", data: newMessage });
  } catch (error) { next(error); }
});
