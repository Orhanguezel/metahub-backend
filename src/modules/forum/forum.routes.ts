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

const router = express.Router();

// Topics
router.post("/topics", authenticate, createTopic);
router.get("/topics/category/:categoryId", getTopicsByCategory);

// Comments
router.post("/comments", authenticate, createComment);
router.get("/comments/topic/:topicId", getCommentsByTopic);

// Categories
router.post("/categories", authenticate, createCategory);
router.get("/categories", getAllCategories);

export default router;
