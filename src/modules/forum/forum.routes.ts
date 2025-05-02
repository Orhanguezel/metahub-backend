import express from "express";
import {
  createTopic,
  getTopicsByCategory,
} from "./forumTopic.controller";
import {
  createComment,
  getCommentsByTopic,
} from "./forumComment.controller";
import {
  createCategory,
  getAllCategories,
} from "./forumCategory.controller";
import { authenticate } from "@/core/middleware/authMiddleware";
import {
  validateCreateTopic,
  validateCreateComment,
  validateCreateCategory,
  validateParamId,
} from "./forum.validation";

const router = express.Router();

// ✅ Topics
router.post("/topics", authenticate, validateCreateTopic, createTopic);
router.get(
  "/topics/category/:categoryId",
  validateParamId,
  getTopicsByCategory
);

// ✅ Comments
router.post("/comments", authenticate, validateCreateComment, createComment);
router.get(
  "/comments/topic/:topicId",
  validateParamId,
  getCommentsByTopic
);

// ✅ Categories
router.post(
  "/categories",
  authenticate,
  validateCreateCategory,
  createCategory
);
router.get("/categories", getAllCategories);

export default router;
