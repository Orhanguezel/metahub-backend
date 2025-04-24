import express from "express";
import forumRoutes from "./forum.routes";

export { default as ForumCategory } from "./forumCategory.models";
export { default as ForumTopic } from "./forumTopic.models";
export { default as ForumComment } from "./forumComment.models";
export * from "./forumCategory.controller";
export * from "./forumComment.controller";
export * from "./forumTopic.controller";


const router = express.Router();
router.use("/", forumRoutes);

export default router;
