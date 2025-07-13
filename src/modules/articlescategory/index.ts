import express from "express";
import routes from "./category.routes";
import { ArticlesCategory } from "./category.models";
import * as articlesCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ArticlesCategory, articlesCategoryController };
export * from "./category.validation";
export default router;
