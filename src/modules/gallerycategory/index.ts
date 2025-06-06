import express from "express";
import routes from "./gallerycategory.routes";
import { GalleryCategory } from "./gallerycategory.models";
import * as GalleryCategoryController from "./gallerycategory.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { GalleryCategory, GalleryCategoryController };
export * from "./gallerycategory.validation";
export default router;
