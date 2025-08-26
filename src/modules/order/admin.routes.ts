import express from "express";
import {
  getAllOrders,
  updateOrderStatus,
  markOrderAsDelivered,
  deleteOrder,
} from "./admin.order.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { updateOrderStatusValidator } from "./validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getAllOrders);

router.put(
  "/:id/status",
  authenticate,
  authorizeRoles("admin"),
  updateOrderStatusValidator,
  validateRequest,
  updateOrderStatus
);

router.put(
  "/:id/deliver",
  authenticate,
  authorizeRoles("admin"),
  markOrderAsDelivered
);

router.delete("/:id", authenticate, authorizeRoles("admin"), deleteOrder);

export default router;
