import express from "express";
import sportRoutes from "./sport.routes";
import Sport, { ISport } from "./sport.models";
import * as sportController from "./sport.controller";

const router = express.Router();
router.use("/", sportRoutes);

export { Sport, ISport, sportController };
export * from "./sport.validation";
export default router;
