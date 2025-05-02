import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsForContent,
  togglePublishComment,
  deleteComment,
} from "./comment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateApiKey } from "@/core/middleware/validateApiKey";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";
import {
  validateCreateComment,
  validateCommentIdParam,
  validateContentIdParam,
} from "./comment.validation";

const router = express.Router();

// 🌍 Public Routes
router.post("/", validateCreateComment, validateApiKey, analyticsLogger, createComment);
router.get("/:type/:id", validateContentIdParam, validateApiKey, analyticsLogger, getCommentsForContent);

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", analyticsLogger, getAllComments);
router.put("/:id/toggle", validateCommentIdParam, analyticsLogger, togglePublishComment);
router.delete("/:id", validateCommentIdParam, analyticsLogger, deleteComment);

export default router;
