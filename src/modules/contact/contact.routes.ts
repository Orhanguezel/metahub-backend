import express from "express";
import { sendMessage, getAllMessages, deleteMessage } from "./contact.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateSendMessage, validateContactIdParam } from "./contact.validation";

const router = express.Router();

// ✅ Public route
router.post("/", validateSendMessage, sendMessage);

// ✅ Admin-only routes
router.get("/", authenticate, authorizeRoles("admin"), getAllMessages);
router.delete("/:id", authenticate, authorizeRoles("admin"), validateContactIdParam, deleteMessage);

export default router;

