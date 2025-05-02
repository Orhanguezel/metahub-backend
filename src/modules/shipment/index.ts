import express from "express";
import shipmentRoutes from "./shipment.routes";
import Shipment, { IShipment } from "./shipment.model";
import * as shipmentController from "./shipment.controller";

const router = express.Router();
router.use("/", shipmentRoutes);

export { Shipment, IShipment, shipmentController };
export * from "./shipment.validation";

export default router;
