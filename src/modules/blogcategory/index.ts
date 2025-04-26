import express from "express";
import routes from "./blogcategory.routes";
import BlogCategory from "./blogcategory.models";
import * as blogCategoryController from "./blogcategory.controller";

const router = express.Router();
router.use("/", routes);

// 📦 Exportlar
export { BlogCategory };
export * from "./blogcategory.controller";
export * from "./blogcategory.models";
export default router;
