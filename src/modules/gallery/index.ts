import express from "express";
import galleryRoutes from "./gallery.routes";
import Gallery, { IGalleryItem } from "./gallery.models";
import * as publicController from "./gallery.public.controller";
import * as adminController from "./gallery.admin.controller";

const router = express.Router();
router.use("/", galleryRoutes);

export { Gallery, IGalleryItem, publicController, adminController };
export * from "./gallery.validation";

export default router;
