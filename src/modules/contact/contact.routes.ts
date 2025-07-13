import express from "express";
import {
  sendMessage,
  getAllMessages,
  deleteMessage,
  markMessageAsRead,
} from "./contact.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateSendMessage,
  validateContactIdParam,
} from "./contact.validation";

const router = express.Router();

// ✅ Public
router.post("/", validateSendMessage, sendMessage);

// ✅ Admin
router.get("/", authenticate, authorizeRoles("admin"), getAllMessages);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateContactIdParam,
  deleteMessage
);
// ✅ Admin: Mesajı okundu işaretle
router.patch(
  "/:id/read",
  authenticate,
  authorizeRoles("admin"),
  validateContactIdParam,
  markMessageAsRead
);

export default router;
