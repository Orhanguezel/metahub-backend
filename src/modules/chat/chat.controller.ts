import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ChatMessage from "./chatMessage.model";
import ChatSession from "./chatSession.model";
import mongoose from "mongoose";

// Kullanıcı tipi (opsiyonel)
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
};

// ✅ Oda mesajlarını getir
export const getMessagesByRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomId } = req.params;
    const messages = await ChatMessage.find({ roomId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  }
);

// ✅ Tüm odalardaki son mesajları getir
export const getAllRoomsLastMessages = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const latestMessages = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$roomId", latestMessage: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestMessage" } },
    ]);

    const populated = await ChatMessage.populate(latestMessages, {
      path: "sender",
      select: "name email",
    });

    res.status(200).json(populated);
  }
);

// ✅ Tek mesaj sil
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const message = await ChatMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      res.status(404).json({ message: "Mesaj bulunamadı." });
      return;
    }

    res.status(200).json({ message: "Mesaj silindi." });
  }
);

// ✅ Çoklu mesaj sil
export const deleteMessagesBulk = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      res.status(400).json({ message: "Geçersiz mesaj ID'leri." });
      return;
    }

    const result = await ChatMessage.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${result.deletedCount} mesaj silindi.` });
  }
);

// ✅ Manuel mesaj gönder
export const sendManualMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { roomId, message, lang = "de", close } = req.body;
    const senderId = req.user?.id;
    const io = req.app.get("io");

    if (!roomId || !message || !senderId) {
      res.status(400).json({ message: "Eksik parametreler." });
      return;
    }

    const newMessage = await ChatMessage.create({
      roomId,
      sender: senderId,
      message,
      isFromAdmin: true,
      isRead: true,
      label: {
        tr: message,
        en: message,
        de: message,
      },
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

    res.status(201).json({ message: "Mesaj gönderildi.", data: newMessage });
  }
);

// ✅ Mesajları okundu olarak işaretle
export const markMessagesAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomId } = req.params;

    await ChatMessage.updateMany(
      { roomId, isRead: false, isFromBot: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "Mesajlar okundu olarak işaretlendi." });
  }
);

// ✅ Arşivlenmiş oturumları getir
export const getArchivedSessions = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const sessions = await ChatMessage.aggregate([
      { $match: { isRead: true, isFromAdmin: true } },
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
  }
);

// ✅ Aktif sohbet oturumlarını getir
export const getActiveChatSessions = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const sessions = await ChatSession.find({ closedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  }
);

// ✅ Tüm sohbet oturumlarını getir
export const getAllChatSessions = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const sessions = await ChatSession.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  }
);