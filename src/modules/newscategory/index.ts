import express from "express";
import routes from "./category.routes";
import { NewsCategory } from "./category.models";
import * as newsCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { NewsCategory, newsCategoryController };
export * from "./category.validation";
export default router;
