import express from "express";
import shipmentRoutes from "./shipment.routes";
import {  Shipment } from "./shipment.models";
import * as shipmentController from "./shipment.controller";

const router = express.Router();
router.use("/", shipmentRoutes);

export { Shipment, shipmentController };
export * from "./shipment.validation";

export default router;
