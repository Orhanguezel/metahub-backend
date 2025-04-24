import express from "express";
import sportRoutes from "./sport.routes";
import Sport from "./sport.models";
import * as sportController from "./sport.controller";

const router = express.Router();
router.use("/", sportRoutes);

export { Sport, sportController };
export default router;
