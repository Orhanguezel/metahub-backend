import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createRefundForOrder,
  listRefunds,
  getRefundById,
  updateRefund,
  deleteRefund,
} from "./admin.controller";
import {
  validateCreateRefund,
  validateListRefunds,
  validateRefundId,
  validateUpdateRefund,
} from "./validation";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "manager", "support"));

/** Create refund for an order (orderNo or _id) */
router.post("/orders/:orderRef/refunds", validateCreateRefund, createRefundForOrder);

/** CRUD */
router.get("/refunds", validateListRefunds, listRefunds);
router.get("/refunds/:id", validateRefundId, getRefundById);
router.put("/refunds/:id", validateUpdateRefund, updateRefund);
router.delete("/refunds/:id", validateRefundId, deleteRefund);

export default router;
