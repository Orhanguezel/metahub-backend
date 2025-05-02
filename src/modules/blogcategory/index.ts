import express from "express";
import routes from "./blogcategory.routes";
import { BlogCategory, IBlogCategory } from "./blogcategory.models";
import * as blogCategoryController from "./blogcategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { BlogCategory, IBlogCategory, blogCategoryController };
export * from "./blogcategory.validation";
export default router;
