import express from "express";
import routes from "./routes";
import { SparepartCategory } from "./models";
import * as SparepartCategoryController from "./controller";

const router = express.Router();
router.use("/", routes);

export { SparepartCategory, SparepartCategoryController };
export * from "./models";
export * from "./validation";

export default router;
