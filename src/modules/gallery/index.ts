import express from "express";
import galleryRoutes from "./gallery.routes";

// ✅ Model & Controller importları
import Gallery, { IGalleryItem } from "./gallery.models";
import * as galleryController from "./gallery.controller";

const router = express.Router();
router.use("/", galleryRoutes);

// ✅ Guard + Export (standart)
export { Gallery, IGalleryItem, galleryController };
export * from "./gallery.validation";

export default router;
