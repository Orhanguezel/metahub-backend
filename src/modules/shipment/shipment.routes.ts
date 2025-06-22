import express from "express";
import {
  getShipments,
  addShipment,
  getShipmentById,
  updateShipment,
  deleteShipment,
} from "./shipment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateShipment,
  validateUpdateShipment,
  validateShipmentId,
} from "./shipment.validation";

const router = express.Router();

// GET /shipments -> Get all shipments
router.get("/", authenticate, authorizeRoles("admin"), getShipments);

// POST /shipments -> Add a new shipment
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateShipment,
  addShipment
);

// GET /shipments/:id -> Get shipment by ID
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateShipmentId,
  getShipmentById
);

// PUT /shipments/:id -> Update shipment
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateShipmentId,
  validateUpdateShipment,
  updateShipment
);

// DELETE /shipments/:id -> Delete shipment
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateShipmentId,
  deleteShipment
);

export default router;
