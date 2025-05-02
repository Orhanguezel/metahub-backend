import express from "express";
import stockmovementRoutes from "./stockmovement.routes";
import Stockmovement, { IStockmovement } from "./stockmovement.models";
import * as stockmovementController from "./stockmovement.controller";

const router = express.Router();

router.use("/", stockmovementRoutes);

export { Stockmovement, IStockmovement, stockmovementController };
export default router;
