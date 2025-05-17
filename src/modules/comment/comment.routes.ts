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
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import {
  validateCreateComment,
  validateCommentIdParam,
  validateContentIdParam,
  validateReplyToComment,

} from "./comment.validation";

const router = express.Router();

// 🌍 Public Routes
router.post("/", validateCreateComment, analyticsLogger, createComment);
router.get("/:type/:id", validateContentIdParam, analyticsLogger, getCommentsForContent);

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", analyticsLogger, getAllComments);
router.put("/:id/toggle", validateCommentIdParam, analyticsLogger, togglePublishComment);
router.delete("/:id", validateCommentIdParam, analyticsLogger, deleteComment);
router.put("/:id/reply", validateReplyToComment, replyToComment);



export default router;
