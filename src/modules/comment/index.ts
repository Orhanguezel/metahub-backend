import express from "express";
import routes from "./comment.routes";
import { Comment } from "./comment.models";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Comment };
export * from "./comment.controller";
export * from "./comment.validation";
export * from "./comment.models";

export default router;
