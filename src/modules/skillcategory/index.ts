import express from "express";
import routes from "./category.routes";
import { SkillCategory } from "./category.models";
import * as SkillCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { SkillCategory, SkillCategoryController };
export * from "./category.validation";
export default router;
