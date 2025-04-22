// src/routes/order.routes.ts
import express from "express";
import {
  createOrder,
  getAllOrders,
  markOrderAsDelivered,
  updateOrderStatus,
} from "./order.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// Create order
router.post("/", authenticate, createOrder);

// Admin endpoints
router.get("/", authenticate, authorizeRoles("admin"), getAllOrders);
router.put("/:id/deliver", authenticate, authorizeRoles("admin"), markOrderAsDelivered);
router.put("/:id/status", authenticate, authorizeRoles("admin"), updateOrderStatus);

export default router;
