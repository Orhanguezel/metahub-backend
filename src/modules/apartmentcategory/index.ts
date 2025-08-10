import express from "express";
import routes from "./category.routes";
import { ApartmentCategory } from "./category.models";
import * as apartmentCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ApartmentCategory, apartmentCategoryController };
export * from "./category.validation";
export default router;
