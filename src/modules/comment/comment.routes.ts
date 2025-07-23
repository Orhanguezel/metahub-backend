import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
  replyToComment,
} from "./comment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateComment,
  validateCommentIdParam,
  validateContentIdParam,
  validateReplyToComment,
} from "./comment.validation";

const router = express.Router();

// 🌍 Public Routes
router.post("/", validateCreateComment, createComment);
router.get("/:type/:id", validateContentIdParam, getCommentsForContent);

// 🔐 Admin Routes (korumalı, admin/moderator)
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", getAllComments);
router.put("/:id/toggle", validateCommentIdParam, togglePublishComment);
router.delete("/:id", validateCommentIdParam, deleteComment);
router.put("/:id/reply", validateReplyToComment, replyToComment);

export default router;
