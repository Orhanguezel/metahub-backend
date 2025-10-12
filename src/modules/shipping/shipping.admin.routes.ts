// src/modules/shipping/shipment.admin.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  listShipments, getShipmentById, createShipment, updateShipment, deleteShipment,
  appendShipmentEvent, markLabelPrinted, markShipped, markDelivered
} from "./shipment.controller";
import {
  validateCreateShipment, validateShipmentId, validateUpdateShipment, validateListShipments,
  validateAppendEvent, validateMarkLabelPrinted, validateMarkShipped, validateMarkDelivered
} from "./shipment.validation";

const router = express.Router();
router.use(authenticate);

// READ herkes (admin panelindeki roller): admin, manager, support, picker, viewer
router.get("/", authorizeRoles("admin","manager","support","picker","viewer"), validateListShipments, listShipments);
router.get("/:id", authorizeRoles("admin","manager","support","picker","viewer"), validateShipmentId, getShipmentById);

// WRITE sadece admin, manager, picker
router.post("/", authorizeRoles("admin","manager","picker"), validateCreateShipment, createShipment);
router.put("/:id", authorizeRoles("admin","manager","picker"), validateShipmentId, validateUpdateShipment, updateShipment);
router.delete("/:id", authorizeRoles("admin","manager"), validateShipmentId, deleteShipment);

router.post("/:id/label", authorizeRoles("admin","manager","picker"), validateMarkLabelPrinted, markLabelPrinted);
router.post("/:id/mark-shipped", authorizeRoles("admin","manager","picker"), validateMarkShipped, markShipped);
router.post("/:id/mark-delivered", authorizeRoles("admin","manager","support"), validateMarkDelivered, markDelivered);

router.post("/:id/events", authorizeRoles("admin","manager","support","picker"), validateAppendEvent, appendShipmentEvent);

export default router;