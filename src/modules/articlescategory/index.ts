import express from "express";
import routes from "./articlescategory.routes";
import { ArticlesCategory, IArticlesCategory } from "./articlescategory.models";
import * as ArticlesCategoryController from "./articlescategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ArticlesCategory, IArticlesCategory, ArticlesCategoryController };
export * from "./articlescategory.validation";
export default router;
