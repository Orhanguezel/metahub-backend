// backend/modules/chat/public.routes.ts
import express from "express";
import {
  getMessagesByRoom,
  getAllRoomsLastMessages,
  markMessagesAsRead,
  getActiveChatSessions,
  sendUserMessage,
} from "./public.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import { validateRoomIdParam, validateSendMessage } from "./validation";

const router = express.Router();

router.get("/:roomId", authenticate, validateRoomIdParam, getMessagesByRoom);
router.get("/", authenticate, getAllRoomsLastMessages);
router.patch("/read/:roomId", authenticate, validateRoomIdParam, markMessagesAsRead);
router.get("/sessions/active", authenticate, getActiveChatSessions);
router.post("/message", authenticate, validateSendMessage, sendUserMessage);

export default router;
// NOT: initChatSSE ve sse.ts dosyasını kaldırabilirsin.
