import express from "express";
import routes from "./apartmentcategory.routes";
import { ApartmentCategory } from "./apartmentcategory.models";
import * as ApartmentCategoryController from "./apartmentcategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ApartmentCategory, ApartmentCategoryController };
export * from "./apartmentcategory.validation";
export default router;
