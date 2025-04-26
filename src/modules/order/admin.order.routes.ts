import express from "express";
import {
  getAllOrders,
  updateOrderStatus,
  markOrderAsDelivered,
  deleteOrder,
} from "./admin.order.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { updateOrderStatusValidator } from "./order.validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

// ✅ Tüm siparişleri getir
router.get("/", authenticate, authorizeRoles("admin"), getAllOrders);

// ✅ Sipariş durumunu güncelle
router.put(
  "/:id/status",
  authenticate,
  authorizeRoles("admin"),
  updateOrderStatusValidator,
  validateRequest,
  updateOrderStatus
);

// ✅ Siparişi teslim edildi olarak işaretle
router.put(
  "/:id/deliver",
  authenticate,
  authorizeRoles("admin"),
  markOrderAsDelivered
);

// ✅ Siparişi sil
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteOrder
);

export default router;
