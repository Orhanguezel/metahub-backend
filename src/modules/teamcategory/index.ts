import express from "express";
import routes from "./category.routes";
import { TeamCategory } from "./category.models";
import * as TeamCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { TeamCategory, TeamCategoryController };
export * from "./category.validation";
export default router;
