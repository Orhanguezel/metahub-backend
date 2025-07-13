import express from "express";
import routes from "./category.routes";
import { ActivityCategory } from "./category.models";
import * as activityCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ActivityCategory, activityCategoryController };
export * from "./category.validation";
export default router;
