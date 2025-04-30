import express from "express";
import {
  getShipments,
  addShipment,
  getShipmentById,
  updateShipment,
  deleteShipment,
} from "./shipment.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// GET /shipments -> Get all shipments
router.get("/", authenticate, authorizeRoles("admin"), getShipments);

// POST /shipments -> Add a new shipment
router.post("/", authenticate, authorizeRoles("admin"), addShipment);

// GET /shipments/:id -> Get shipment by ID
router.get("/:id", authenticate, authorizeRoles("admin"), getShipmentById);

// PUT /shipments/:id -> Update shipment
router.put("/:id", authenticate, authorizeRoles("admin"), updateShipment);

// DELETE /shipments/:id -> Delete shipment
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteShipment);

export default router;
