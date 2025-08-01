import express from "express";
import routes from "./category.routes";
import { MassageCategory } from "./category.models";
import * as massageCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { MassageCategory, massageCategoryController };
export * from "./category.validation";
export default router;
