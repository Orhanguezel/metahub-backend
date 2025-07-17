import express from "express";
import routes from "./routes";
import { GalleryCategory } from "./models";
import * as GalleryCategoryController from "./controller";

const router = express.Router();
router.use("/", routes);

export { GalleryCategory, GalleryCategoryController };
export * from "./models";
export * from "./validation";

export default router;
