import express from "express";
import routes from "./routes";
import { EnsotekCategory } from "./models";
import * as EnsotekCategoryController from "./controller";

const router = express.Router();
router.use("/", routes);

export { EnsotekCategory, EnsotekCategoryController };
export * from "./models";
export * from "./validation";

export default router;
