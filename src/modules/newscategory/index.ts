import express from "express";
import routes from "./newscategory.routes";
import {NewsCategory} from "./newscategory.models";
import * as newscategoryController from "./newscategory.controller";

const router = express.Router();
router.use("/", routes);

export { NewsCategory, newscategoryController };
export * from "./newscategory.models";
export * from "./newscategory.validation";

export default router;
