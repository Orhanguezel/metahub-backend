import express from "express";
import routes from "./routes";
import { BikeCategory } from "./models";
import * as BikeCategoryController from "./controller";

const router = express.Router();
router.use("/", routes);

export { BikeCategory, BikeCategoryController };
export * from "./models";
export * from "./validation";

export default router;
