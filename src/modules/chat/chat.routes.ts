import express from "express";
import {
  getMessagesByRoom,
  getAllRoomsLastMessages,
  deleteMessage,
  deleteMessagesBulk,
  sendManualMessage,
  markMessagesAsRead,
  getArchivedSessions,
  getActiveChatSessions,
  getAllChatSessions,
} from "./chat.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import {
  validateManualMessage,
  validateBulkDelete,
  validateIdParam,
  validateRoomIdParam,
} from "./chat.validation";

const router = express.Router();

// ✅ Public + Auth: Get all messages for a room
router.get(
  "/:roomId",
  authenticate,
  analyticsLogger,
  validateRoomIdParam,
  getMessagesByRoom
);

// ✅ Admin-only routes
router.use(authenticate, authorizeRoles("admin"));

// ✅ Admin: Get last messages (grouped by rooms)
router.get("/", getAllRoomsLastMessages);

// ✅ Admin: Delete a single message
router.delete("/:id", validateIdParam, deleteMessage);

// ✅ Admin: Bulk delete messages
router.post("/bulk", validateBulkDelete, deleteMessagesBulk);

// ✅ Admin: Send manual message
router.post("/manual", validateManualMessage, sendManualMessage);

// ✅ Admin: Mark all messages in a room as read
router.patch("/read/:roomId", validateRoomIdParam, markMessagesAsRead);

// ✅ Admin: Get archived sessions
router.get("/archived", getArchivedSessions);

// ✅ Admin: Get active chat sessions
router.get("/sessions/active", getActiveChatSessions);

// ✅ Admin: Get all chat sessions
router.get("/sessions", getAllChatSessions);

export default router;
