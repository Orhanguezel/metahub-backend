import { Request } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

// Helper: Contextten locale ve t() almak için
function getLocaleT(req: Request) {
  const locale = req.locale as SupportedLocale | undefined;
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);
  return { locale, t };
}

// --- ADMIN --- //

// 6. Tüm odaların son mesajlarını getir (admin)
export const getAllRoomsLastMessages = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const latestMessages = await ChatMessage.aggregate([
      { $match: { tenant: req.tenant } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$roomId", latestMessage: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestMessage" } },
    ]);

    const populated = await ChatMessage.populate(latestMessages, {
      path: "sender",
      select: "name email",
    });

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
});

// 7. Bir odadaki mesajları okundu olarak işaretle (admin)
export const markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { roomId } = req.params;

    await ChatMessage.updateMany(
      { roomId, isRead: false, isFromBot: false, tenant: req.tenant },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: t("markAsRead.success") });
  } catch (error) {
    next(error);
  }
});

// 8. Aktif chat sessionlarını getir (admin)
export const getActiveChatSessions = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatSession } = await getTenantModels(req);
  try {
    const sessions = await ChatSession.find({
      closedAt: { $exists: false },
      tenant: req.tenant,
    })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
});

// 1. Mesajı sil
export const deleteMessage = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const message = await ChatMessage.findOneAndDelete({
      _id: req.params.id,
      tenant: req.tenant,
    });
    if (!message) {
      res.status(404).json({ message: t("delete.notFound") });
      return;
    }
    res.status(200).json({ message: t("delete.success") });
  } catch (error) {
    next(error);
  }
});

// 2. Toplu mesaj sil
export const deleteMessagesBulk = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { ids } = req.body;
    if (
      !Array.isArray(ids) ||
      !ids.every((id) => mongoose.Types.ObjectId.isValid(id))
    ) {
      res.status(400).json({ message: t("delete.invalidIds") });
      return;
    }
    const result = await ChatMessage.deleteMany({
      _id: { $in: ids },
      tenant: req.tenant,
    });
    res
      .status(200)
      .json({
        message: t("delete.success"),
        deletedCount: result.deletedCount,
      });
  } catch (error) {
    next(error);
  }
});

// 3. Elle mesaj gönder (admin)
export const sendManualMessage = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage, ChatSession } = await getTenantModels(req);
  try {
    const { roomId, message, close } = req.body;
    const senderId = req.user?.id;
    const io = req.app.get("io");

    if (!roomId || !message || !senderId) {
      res.status(400).json({ message: t("sendMessage.missingParams") });
      return;
    }
    const userLocale = (req.locale as SupportedLocale) || "en";
    const language = fillAllLocales(
      req.body.language ?? req.body.message,
      userLocale
    );

    const newMessage = await ChatMessage.create({
      roomId,
      sender: senderId,
      tenant: req.tenant,
      message, // veya req.body.message
      isFromAdmin: true,
      isRead: true,
      language, // <-- fillAllLocales ile tüm diller otomatik dolu!
    });

    io?.to(roomId).emit("chat-message", {
      _id: newMessage.id,
      message: newMessage.message,
      sender: {
        _id: senderId,
        name: req.user?.name,
        email: req.user?.email,
      },
      room: roomId,
      createdAt: newMessage.createdAt,
      isFromAdmin: true,
    });

    if (close) {
      await ChatSession.findOneAndUpdate({ roomId }, { closedAt: new Date() });
    }

    res
      .status(201)
      .json({ message: t("sendMessage.success"), data: newMessage });
  } catch (error) {
    next(error);
  }
});

// 4. Arşivlenmiş sessionları getir
export const getArchivedSessions = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const sessions = await ChatMessage.aggregate([
      { $match: { isRead: true, isFromAdmin: true, tenant: req.tenant } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$roomId", lastMessage: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$lastMessage" } },
    ]);

    const populated = await ChatMessage.populate(sessions, {
      path: "sender",
      select: "name email",
    });

    const formatted = populated.map((msg: any) => ({
      room: msg.roomId,
      user: msg.sender,
      lastMessage: msg.message,
      closedAt: msg.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
});

// 5. Tüm sessionları (aktif+kapalı) getir
export const getAllChatSessions = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatSession } = await getTenantModels(req);
  try {
    const sessions = await ChatSession.find({ tenant: req.tenant })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
});
