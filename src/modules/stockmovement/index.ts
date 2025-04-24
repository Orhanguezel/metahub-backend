import express from "express";
import stockmovementRoutes from "./stockmovement.routes";
import Stockmovement from "./stockmovement.models";
import * as stockmovementController from "./stockmovement.controller";

const router = express.Router();
router.use("/", stockmovementRoutes);

export { Stockmovement, stockmovementController };
export default router;
