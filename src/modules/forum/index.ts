// ─────────────────────────────────────────────
// Forum - Exports
// ─────────────────────────────────────────────
export * from "./forumTopic.controller";
export * from "./forumTopic.models";

export * from "./forumComment.controller";
export * from "./forumComment.models";

export * from "./forumCategory.controller";
export * from "./forumCategory.models";

import express from "express";
import forumTopicRoutes from "./forumTopic.routes";

const router = express.Router();

router.use("/topics", forumTopicRoutes);

export default router;

