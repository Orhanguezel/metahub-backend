import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import ChatMessage, { ChatMessageDocument } from "./chatMessage.model";
import ChatSession from "./chatSession.model";
import mongoose from "mongoose";

// Eğer req.user kullanıyorsan, özel tip tanımı (opsiyonel)
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
};

// 📥 GET /chat/:roomId
export const getMessagesByRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;

  try {
    const messages = await ChatMessage.find({ roomId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ getMessagesByRoom error:", error);
    res.status(500).json({ message: "Mesajlar alınamadı" });
  }
});

// 📥 GET /chat
export const getAllRoomsLastMessages = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error("❌ getAllRoomsLastMessages error:", error);
    res.status(500).json({ message: "Son mesajlar alınamadı" });
  }
});

// 🗑️ DELETE /chat/:id
export const deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const message = await ChatMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      res.status(404).json({ message: "Mesaj bulunamadı" });
      return;
    }

    res.status(200).json({ message: "Mesaj silindi" });
  } catch (error) {
    console.error("❌ deleteMessage error:", error);
    res.status(500).json({ message: "Mesaj silinemedi" });
  }
});

// 🗑️ DELETE /chat/bulk
export const deleteMessagesBulk = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    res.status(400).json({ message: "Geçersiz mesaj ID'leri" });
    return;
  }

  try {
    const result = await ChatMessage.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${result.deletedCount} mesaj silindi` });
  } catch (error) {
    console.error("❌ deleteMessagesBulk error:", error);
    res.status(500).json({ message: "Mesajlar silinemedi" });
  }
});

// 📨 POST /chat/manual
export const sendManualMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId, message, lang = "de", close } = req.body;
  const senderId = req.user?.id;
  const io = req.app.get("io");

  if (!roomId || !message || !senderId) {
    res.status(400).json({ message: "Eksik parametreler" });
    return;
  }

  try {
    const newMessage = await ChatMessage.create({
      roomId,
      sender: senderId,
      message,
      isFromAdmin: true,
      isRead: true,
      language: lang,
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
      language: lang,
    });

    if (close) {
      await ChatSession.findOneAndUpdate({ roomId }, { closedAt: new Date() });
    }

    res.status(201).json({ message: "Mesaj gönderildi", data: newMessage });
  } catch (error) {
    console.error("❌ sendManualMessage error:", error);
    res.status(500).json({ message: "Mesaj gönderilemedi" });
  }
});

// ✅ PATCH /chat/read/:roomId
export const markMessagesAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;

  try {
    await ChatMessage.updateMany(
      { roomId, isRead: false, isFromBot: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "Tüm mesajlar okundu olarak işaretlendi" });
  } catch (error) {
    console.error("❌ markMessagesAsRead error:", error);
    res.status(500).json({ message: "Mesajlar okunamadı" });
  }
});

// 📥 GET /chat/archived
export const getArchivedSessions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    console.error("❌ getArchivedSessions error:", error);
    res.status(500).json({ message: "Arşivlenmiş sohbetler alınamadı." });
  }
});

// 📥 GET /chat/sessions
export const getActiveChatSessions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await ChatSession.find({ closedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  } catch (error) {
    console.error("❌ getActiveChatSessions error:", error);
    res.status(500).json({ message: "Aktif oturumlar alınamadı." });
  }
});

// 📥 GET /chat/sessions/all
export const getAllChatSessions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await ChatSession.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json(sessions);
  } catch (error) {
    console.error("❌ getAllChatSessions error:", error);
    res.status(500).json({ message: "Oturumlar alınamadı." });
  }
});
