import express from "express";
import routes from "./sportcategory.routes";
import { SportCategory } from "./sportcategory.models";
import * as blogCategoryController from "./sportcategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { SportCategory, blogCategoryController };
export * from "./sportcategory.validation";
export default router;
