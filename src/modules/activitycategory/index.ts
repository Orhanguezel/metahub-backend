import express from "express";
import routes from "./activitycategory.routes";
import { ActivityCategory, IActivityCategory } from "./activitycategory.models";
import * as ActivityCategoryController from "./activitycategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ActivityCategory, IActivityCategory, ActivityCategoryController };
export * from "./activitycategory.validation";
export default router;
