import express from "express";
import galleryRoutes from "./gallery.routes";
import  {Gallery } from "./gallery.models";
import * as publicController from "./gallery.public.controller";
import * as adminController from "./gallery.admin.controller";

const router = express.Router();
router.use("/", galleryRoutes);

export { Gallery, publicController, adminController };
export * from "./gallery.validation";

export default router;
