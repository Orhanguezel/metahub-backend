// src/modules/order/admin.routes.ts
import express from "express";
import {
  listOrders,
  getOrderByNo,
  updateOrderStatus,
  markOrderAsDelivered,
  deleteOrder,
  cancelOrder,
  addOrderNote,
} from "./admin.order.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  updateOrderStatusValidator,
  listOrdersValidator,
  getByOrderNoValidator,
  cancelOrderValidator,
  addOrderNoteValidator,
} from "./validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

/** LIST: herkes görebilir (admin, manager, support, picker, viewer) */
router.get(
  "/",
  authenticate,
  authorizeRoles("admin", "manager", "support", "picker", "viewer"),
  listOrdersValidator,
  listOrders
);

/** DETAIL by orderNo */
router.get(
  "/by-no/:orderNo",
  authenticate,
  authorizeRoles("admin", "manager", "support", "picker", "viewer"),
  getByOrderNoValidator,
  validateRequest,
  getOrderByNo
);

/** STATUS UPDATE: admin, manager, support, picker */
router.put(
  "/:id/status",
  authenticate,
  authorizeRoles("admin", "manager", "support", "picker"),
  updateOrderStatusValidator,
  validateRequest,
  updateOrderStatus
);

/** MARK DELIVERED: admin, manager, picker */
router.put(
  "/:id/deliver",
  authenticate,
  authorizeRoles("admin", "manager", "picker"),
  markOrderAsDelivered
);

/** CANCEL: admin, manager, support */
router.post(
  "/:id/cancel",
  authenticate,
  authorizeRoles("admin", "manager", "support"),
  cancelOrderValidator,
  cancelOrder
);

/** NOTES: admin, manager, support */
router.post(
  "/:id/notes",
  authenticate,
  authorizeRoles("admin", "manager", "support"),
  addOrderNoteValidator,
  addOrderNote
);

/** DELETE: sadece admin (passif & unpaid) */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteOrder
);

export default router;
