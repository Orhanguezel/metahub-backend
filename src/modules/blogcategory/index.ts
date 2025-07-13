import express from "express";
import routes from "./category.routes";
import { BlogCategory } from "./category.models";
import * as blogCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { BlogCategory, blogCategoryController };
export * from "./category.validation";
export default router;
