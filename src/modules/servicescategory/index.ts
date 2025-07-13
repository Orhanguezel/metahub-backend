import express from "express";
import routes from "./category.routes";
import { ServicesCategory } from "./category.models";
import * as servicesCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { ServicesCategory, servicesCategoryController };
export * from "./category.validation";
export default router;
