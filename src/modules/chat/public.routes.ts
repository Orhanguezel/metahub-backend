import express from "express";
import {
  getMessagesByRoom,
  getAllRoomsLastMessages,
  markMessagesAsRead,
  getActiveChatSessions,
  sendUserMessage,
} from "./public.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateRoomIdParam,validateSendMessage } from "./validation";

const router = express.Router();

// 🟢 Public + Auth: Oda mesajlarını getir
router.get("/:roomId", authenticate, validateRoomIdParam, getMessagesByRoom);

// 🟢 Public + Auth: Tüm odaların son mesajı
router.get("/", authenticate, getAllRoomsLastMessages);

// 🟢 Public + Auth: Bir odadaki tüm mesajları okundu olarak işaretle
router.patch(
  "/read/:roomId",
  authenticate,
  validateRoomIdParam,
  markMessagesAsRead
);

// 🟢 Public + Auth: Aktif chat sessionlarını getir
router.get("/sessions/active", authenticate, getActiveChatSessions);

router.post("/message", authenticate, validateSendMessage, sendUserMessage);

export default router;
