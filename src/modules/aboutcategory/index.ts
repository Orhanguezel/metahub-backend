import express from "express";
import routes from "./aboutcategory.routes";
import { AboutCategory, IAboutCategory } from "./aboutcategory.models";
import * as AboutCategoryController from "./aboutcategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { AboutCategory, IAboutCategory, AboutCategoryController };
export * from "./aboutcategory.validation";
export default router;
