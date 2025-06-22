import express from "express";
import routes from "./category.routes";
import { ReferencesCategory } from "./category.models";
import * as ReferencesCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ReferencesCategory, ReferencesCategoryController };
export * from "./category.validation";
export default router;
