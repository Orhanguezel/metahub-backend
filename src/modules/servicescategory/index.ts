import express from "express";
import routes from "./servicescategory.routes";
import { ServicesCategory, IServicesCategory } from "./servicescategory.models";
import * as ServicesCategoryController from "./servicescategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ServicesCategory, IServicesCategory, ServicesCategoryController };
export * from "./servicescategory.validation";
export default router;
