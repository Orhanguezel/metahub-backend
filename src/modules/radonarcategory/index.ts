import express from "express";
import routes from "./radonarcategory.routes";
import {RadonarCategory} from "./radonarcategory.models";
import * as RadonarCategoryController from "./radonarcategory.controller";

const router = express.Router();
router.use("/", routes);

export { RadonarCategory, RadonarCategoryController };
export * from "./radonarcategory.models";
export * from "./radonarcategory.validation";

export default router;
