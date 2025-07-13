import express from "express";
import routes from "./category.routes";
import { AboutCategory } from "./category.models";
import * as AboutCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { AboutCategory, AboutCategoryController };
export * from "./category.validation";
export default router;
