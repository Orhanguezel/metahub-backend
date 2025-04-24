// src/modules/comment/index.ts
import express from "express";
import routes from "./comment.routes";
import Comment from "./comment.models";

const router = express.Router();
router.use("/", routes);

export * from "./comment.controller";
export { Comment };
export * from "./comment.models";
export default router;
