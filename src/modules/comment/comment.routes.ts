import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
  replyToComment,
  getTestimonialsPublic, // ⬅️ eklendi
} from "./comment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateComment,
  validateCommentIdParam,
  validateContentIdParam,
  validateReplyToComment,
  validateListTestimonials, // ⬅️ eklendi (opsiyonel query doğrulama)
} from "./validation";

const router = express.Router();

/* 🌍 Public Routes */
router.post("/", validateCreateComment, createComment);
router.get("/testimonials", validateListTestimonials, getTestimonialsPublic); // ⬅️ yeni public uç
router.get("/:type/:id", validateContentIdParam, getCommentsForContent);

/* 🔐 Admin Routes (korumalı) */
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", getAllComments);
router.put("/:id/toggle", validateCommentIdParam, togglePublishComment);
router.delete("/:id", validateCommentIdParam, deleteComment);
router.put("/:id/reply", validateReplyToComment, replyToComment);

export default router;
