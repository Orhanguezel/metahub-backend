import { Router } from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validatePaymentCreate, validatePaymentUpdateMethod } from "./payment.validation";
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

const router = Router();

// 🧪 Simulation Routes (admin)
router.post("/simulate/stripe", authenticate, authorizeRoles("admin"), simulateStripePayment);
router.post("/simulate/paypal", authenticate, authorizeRoles("admin"), simulatePayPalPayment);

// 💳 Payment Actions
router.post("/", authenticate, validatePaymentCreate, createPayment);
router.get("/", authenticate, authorizeRoles("admin"), getAllPayments);
router.get("/user", authenticate, getPaymentsByUser);
router.get("/order/:orderId", authenticate, getPaymentByOrderId);
router.put("/:id/mark-paid", authenticate, authorizeRoles("admin"), markPaymentAsPaid);
router.put("/:id/mark-failed", authenticate, authorizeRoles("admin"), markPaymentAsFailed);
router.put("/:id/update-method", authenticate, authorizeRoles("admin"), validatePaymentUpdateMethod, updatePaymentMethod);

export default router;
