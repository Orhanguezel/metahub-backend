import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { Request } from "express";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

function getLocaleT(req: Request) {
  const locale = req.locale as SupportedLocale | undefined;
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  return { locale, t };
}

/** 1) Tek mesaj sil (admin) */
export const deleteMessage = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const message = await ChatMessage.findOneAndDelete({ _id: req.params.id, tenant: req.tenant });
    if (!message) { res.status(404).json({ success: false, message: t("delete.notFound") }); return; }
    res.status(200).json({ success: true, message: t("delete.success") });
  } catch (error) { next(error); }
});

/** 2) Toplu mesaj sil (admin) */
export const deleteMessagesBulk = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      res.status(400).json({ success: false, message: t("delete.invalidIds") }); return;
    }
    const result = await ChatMessage.deleteMany({ _id: { $in: ids }, tenant: req.tenant });
    res.status(200).json({ success: true, message: t("delete.success"), data: { deletedCount: result.deletedCount } });
  } catch (error) { next(error); }
});

/** 3) Elle mesaj gönder (admin) */
export const sendManualMessage = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage, ChatSession } = await getTenantModels(req);
  try {
    const { roomId, message, close } = req.body || {};
    const senderId = req.user?.id;
    const io = req.app.get("io");

    if (!roomId || !message || !senderId) {
      res.status(400).json({ success: false, message: t("sendMessage.missingParams") }); return;
    }
    const userLocale = (req.locale as SupportedLocale) || "en";

    const newMessage = await ChatMessage.create({
      roomId,
      sender: senderId,
      tenant: req.tenant,
      message,
      isFromAdmin: true,
      isRead: true,
      language: fillAllLocales(req.body.language ?? message, userLocale),
    });

    io?.to(roomId).emit("chat-message", {
      _id: newMessage.id,
      message: newMessage.message,
      sender: { _id: senderId, name: req.user?.name, email: req.user?.email },
      room: roomId,
      createdAt: newMessage.createdAt,
      isFromAdmin: true,
    });

    const sse = req.app.get("sse");
    sse?.publish?.(req.tenant, String(roomId), { type: "message.created", payload: newMessage.toObject?.() ?? newMessage });

    if (close) await ChatSession.findOneAndUpdate({ tenant: req.tenant, roomId }, { closedAt: new Date() });

    res.status(201).json({ success: true, message: t("sendMessage.success"), data: newMessage });
  } catch (error) { next(error); }
});

/** 4) Arşivlenmiş sessionlar (admin görünümü) */
export const getArchivedSessions = asyncHandler(async (req, res, next) => {
  const { ChatMessage } = await getTenantModels(req);
  try {
    const sessions = await ChatMessage.aggregate([
      { $match: { isRead: true, isFromAdmin: true, tenant: req.tenant } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$roomId", lastMessage: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$lastMessage" } },
    ]);
    const populated = await ChatMessage.populate(sessions, { path: "sender", select: "name email" });
    const formatted = populated.map((msg: any) => ({
      room: msg.roomId,
      user: msg.sender,
      lastMessage: msg.message,
      closedAt: msg.createdAt,
    }));
    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
});

/** 5) Aktif sessionlar (admin) */
export const getActiveChatSessions = asyncHandler(async (req, res, next) => {
  const { ChatSession } = await getTenantModels(req);
  try {
    const sessions = await ChatSession.find({ tenant: req.tenant, closedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();
    res.status(200).json({ success: true, data: sessions });
  } catch (error) { next(error); }
});

/** 6) Tüm odaların son mesajları (admin) */
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

/** 7) Bir odadaki tüm mesajları okundu işaretle (admin) */
export const markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { roomId } = req.params;
    await ChatMessage.updateMany(
      { tenant: req.tenant, roomId, isRead: false, isFromBot: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: t("markAsRead.success") });
  } catch (error) { next(error); }
});

/** 8) Tüm sessionlar (admin) */
export const getAllChatSessions = asyncHandler(async (req, res, next) => {
  const { ChatSession } = await getTenantModels(req);
  try {
    const sessions = await ChatSession.find({ tenant: req.tenant })
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();
    res.status(200).json({ success: true, data: sessions });
  } catch (error) { next(error); }
});
