import express from "express";
import { sendMessage, getAllMessages, deleteMessage } from "./contact.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.post("/", sendMessage);

router.get("/", authenticate, authorizeRoles("admin"), getAllMessages);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteMessage);

export default router;
