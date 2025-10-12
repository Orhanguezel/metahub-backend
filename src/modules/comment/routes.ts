// routes: src/modules/comment/router.ts (veya benzeri)
import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
  replyToComment,
  getTestimonialsPublic,
  getMyComments,
} from "./controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  validateCreateComment,
  validateCommentIdParam,
  validateContentIdParam,
  validateReplyToComment,
  validateListTestimonials,
  validateListMine,
} from "./validation";

const router = express.Router();

/* 🌍 Public Routes */
router.post("/", validateCreateComment, createComment);
router.get("/testimonials", validateListTestimonials, getTestimonialsPublic);

/* 👤 Auth kullanıcının kendi yorumları
   ⛔️ DİKKAT: Bu rota parametreli rotadan ÖNCE gelmeli! */
router.get("/user/me", authenticate, validateListMine, getMyComments);

/* 🌍 Public: belirli içeriğin yorumları */
router.get("/:type/:id", validateContentIdParam, getCommentsForContent);

/* 🔐 Admin Routes (korumalı) */
router.use(authenticate, authorizeRoles("admin", "moderator"));
router.get("/", getAllComments);
router.put("/:id/toggle", validateCommentIdParam, togglePublishComment);
router.delete("/:id", validateCommentIdParam, deleteComment);
router.put("/:id/reply", validateReplyToComment, replyToComment);

export default router;
