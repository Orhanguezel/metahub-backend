import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale } from "@/types/common";

function getLocaleT(req: Request) {
  const locale = req.locale as SupportedLocale | undefined;
  const t = (key: string, params?: any) =>
    translate(key, locale, translations, params);
  return { locale, t };
}

// 1. Oda mesajlarını getir
export const getMessagesByRoom = asyncHandler(async (req, res, next) => {
  const { t } = getLocaleT(req);
  const { ChatMessage } = await getTenantModels(req);
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.find({ roomId, tenant: req.tenant })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

// 2. Odanın son mesajı (tüm odalar)
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

// 3. Mesajları okundu olarak işaretle
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

// 4. Aktif chat sessionları (kullanıcıya açık)
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

export const sendUserMessage = asyncHandler(async (req, res, next) => {
  const { ChatMessage, ChatSession } = await getTenantModels(req);
  try {
    const { roomId, message } = req.body;
    const userLocale = req.locale as SupportedLocale || "en";

    if (!roomId || !message) {
      res.status(400).json({ message: "Missing params." });
      return;
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

    // (isteğe bağlı: oda yoksa session yarat)
    await ChatSession.updateOne(
      { roomId, tenant: req.tenant },
      { $setOnInsert: { roomId, tenant: req.tenant, user: req.user?.id } },
      { upsert: true }
    );

    // (isteğe bağlı: io.emit ile real-time gönder)
    req.app.get("io")?.to(roomId).emit("chat-message", {
      _id: newMessage.id,
      message: newMessage.message,
      sender: { _id: req.user?.id, name: req.user?.name, email: req.user?.email },
      room: roomId,
      createdAt: newMessage.createdAt,
      isFromAdmin: false,
    });

    res.status(201).json({ message: "Message sent.", data: newMessage });
  } catch (error) {
    next(error);
  }
});
