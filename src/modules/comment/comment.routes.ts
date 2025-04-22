// src/routes/comment.routes.ts

import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
} from "./comment.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 💬 Public
router.post("/", createComment);
router.get("/:type/:id", getCommentsForContent); // blog, product, service vs.

// 🔐 Admin Panel
router.get("/", authenticate, authorizeRoles("admin", "moderator"), getAllComments);
router.put("/:id/toggle", authenticate, authorizeRoles("admin", "moderator"), togglePublishComment);
router.delete("/:id", authenticate, authorizeRoles("admin", "moderator"), deleteComment);

export default router;
