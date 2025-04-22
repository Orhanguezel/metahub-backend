import express from "express";
import {
  createPayment,
  getAllPayments,
  getPaymentByOrderId,
  markPaymentAsPaid,
  markPaymentAsFailed,
  updatePaymentMethod,
  getPaymentsByUser,
  simulateStripePayment,
  simulatePayPalPayment,
} from "./payment.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🧪 Simulations (Önce tanımlanmalı!)
router.post("/simulate/stripe", authenticate, authorizeRoles("admin"), simulateStripePayment);
router.post("/simulate/paypal", simulatePayPalPayment);

// 💳 Payment işlemleri
router.post("/", authenticate, createPayment);
router.get("/", authenticate, authorizeRoles("admin"), getAllPayments);
router.get("/user", authenticate, getPaymentsByUser);
router.put("/:id/mark-paid", authenticate, authorizeRoles("admin"), markPaymentAsPaid);
router.put("/:id/mark-failed", authenticate, authorizeRoles("admin"), markPaymentAsFailed);
router.put("/:id/update-method", authenticate, authorizeRoles("admin"), updatePaymentMethod);
router.get("/order/:orderId", authenticate, getPaymentByOrderId);

export default router;
