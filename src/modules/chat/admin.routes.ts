import express from "express";
import {
  getAllRoomsLastMessages,
  deleteMessage,
  deleteMessagesBulk,
  sendManualMessage,
  markMessagesAsRead,
  getArchivedSessions,
  getActiveChatSessions,
  getAllChatSessions,
} from "./admin.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateManualMessage,
  validateBulkDelete,
  validateIdParam,
  validateRoomIdParam,
} from "./validation";

const router = express.Router();

// 🛡️ Tüm admin endpointleri için auth + yetki zorunlu!
router.use(authenticate, authorizeRoles("admin"));

// ✅ Admin: Get last messages (grouped by rooms)
router.get("/", getAllRoomsLastMessages);

// ✅ Admin: Delete a single message by ID
router.delete("/:id", validateIdParam, deleteMessage);

// ✅ Admin: Bulk delete messages by IDs
router.post("/bulk", validateBulkDelete, deleteMessagesBulk);

// ✅ Admin: Send manual message to a room
router.post("/manual", validateManualMessage, sendManualMessage);

// ✅ Admin: Mark all messages in a room as read
router.patch("/read/:roomId", validateRoomIdParam, markMessagesAsRead);

// ✅ Admin: Get archived (closed) chat sessions
router.get("/archived", getArchivedSessions);

// ✅ Admin: Get active (open) chat sessions
router.get("/sessions/active", getActiveChatSessions);

// ✅ Admin: Get all chat sessions (active+closed)
router.get("/sessions", getAllChatSessions);

export default router;
