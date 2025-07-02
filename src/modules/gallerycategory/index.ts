import express from "express";
import routes from "./gallerycategory.routes";
import {GalleryCategory} from "./gallerycategory.models";
import * as gallerycategoryController from "./gallerycategory.controller";

const router = express.Router();
router.use("/", routes);

export { GalleryCategory, gallerycategoryController };
export * from "./gallerycategory.models";
export * from "./gallerycategory.validation";

export default router;
