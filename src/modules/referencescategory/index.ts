import express from "express";
import routes from "./category.routes";
import { ReferenceCategory } from "./category.models";
import * as ReferenceCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ReferenceCategory, ReferenceCategoryController };
export * from "./category.validation";
export default router;
