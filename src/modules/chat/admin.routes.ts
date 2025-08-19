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

// 🛡️ Tüm admin endpoint’leri: auth + admin rolü
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllRoomsLastMessages);
router.delete("/:id", validateIdParam, deleteMessage);
router.post("/bulk", validateBulkDelete, deleteMessagesBulk);
router.post("/manual", validateManualMessage, sendManualMessage);
router.patch("/read/:roomId", validateRoomIdParam, markMessagesAsRead);
router.get("/archived", getArchivedSessions);
router.get("/sessions/active", getActiveChatSessions);
router.get("/sessions", getAllChatSessions);

export default router;
