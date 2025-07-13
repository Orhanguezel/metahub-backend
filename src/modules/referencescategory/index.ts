import express from "express";
import routes from "./category.routes";
import { ReferencesCategory } from "./category.models";
import * as referencesCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ReferencesCategory, referencesCategoryController };
export * from "./category.validation";
export default router;
