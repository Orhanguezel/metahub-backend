import express from "express";
import {
  getShipments,
  addShipment,
  getShipmentById,
  updateShipment,
  deleteShipment,
} from "./shipment.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router
  .route("/")
  .get(authenticate, authorizeRoles("admin"), getShipments)
  .post(authenticate, authorizeRoles("admin"), addShipment);

router
  .route("/:id")
  .get(authenticate, authorizeRoles("admin"), getShipmentById)
  .put(authenticate, authorizeRoles("admin"), updateShipment)
  .delete(authenticate, authorizeRoles("admin"), deleteShipment);

export default router;
