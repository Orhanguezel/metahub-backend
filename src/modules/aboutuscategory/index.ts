import express from "express";
import routes from "./category.routes";
import { AboutusCategory } from "./category.models";
import * as AboutusCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { AboutusCategory, AboutusCategoryController };
export * from "./category.validation";
export default router;
