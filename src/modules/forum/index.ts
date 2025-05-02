import express from "express";
import forumRoutes from "./forum.routes";

// ✅ Models
import ForumCategory, { IForumCategory } from "./forumCategory.models";
import ForumTopic, { IForumTopic } from "./forumTopic.models";
import ForumComment, { IForumComment } from "./forumComment.models";

// ✅ Controllers
import * as forumCategoryController from "./forumCategory.controller";
import * as forumTopicController from "./forumTopic.controller";
import * as forumCommentController from "./forumComment.controller";

const router = express.Router();
router.use("/", forumRoutes);

// ✅ Guard + Export (standardized)
export {
  ForumCategory,
  IForumCategory,
  ForumTopic,
  IForumTopic,
  ForumComment,
  IForumComment,
  forumCategoryController,
  forumTopicController,
  forumCommentController,
};

export default router;
