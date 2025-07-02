import express from "express";
import routes from "./category.routes";
import { ServicesCategory } from "./category.models";
import * as ServicesCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ServicesCategory, ServicesCategoryController };
export * from "./category.validation";
export default router;
