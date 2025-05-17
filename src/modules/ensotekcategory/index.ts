import express from "express";
import routes from "./ensotekcategory.routes";
import EnsotekCategory from "./ensotekcategory.models";
import * as ensotekCategoryController from "./ensotekcategory.controller";

const router = express.Router();
router.use("/", routes);

export { EnsotekCategory, ensotekCategoryController };
export * from "./ensotekcategory.models";
export * from "./ensotekcategory.validation";

export default router;
