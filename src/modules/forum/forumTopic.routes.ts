import express from "express";
import {
  createTopic,
  getTopicsByCategory,
} from "./forumTopic.controller";
import { authenticate } from "../../core/middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, createTopic);
router.get("/category/:categoryId", getTopicsByCategory);

export default router;
