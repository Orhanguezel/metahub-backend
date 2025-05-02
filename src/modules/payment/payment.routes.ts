import { Router } from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validatePaymentCreate, validatePaymentUpdateMethod, validatePaymentIdParam } from "./payment.validation";
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

// 🧪 Simulation Routes (Admin)
router.post(
  "/simulate/stripe",
  authenticate,
  authorizeRoles("admin"),
  simulateStripePayment
);
router.post(
  "/simulate/paypal",
  authenticate,
  authorizeRoles("admin"),
  simulatePayPalPayment
);

// 💳 Payment Creation & Fetch
router.post("/", authenticate, validatePaymentCreate, createPayment);
router.get("/", authenticate, authorizeRoles("admin"), getAllPayments);
router.get("/user", authenticate, getPaymentsByUser);
router.get("/order/:orderId", authenticate, getPaymentByOrderId);

// 🛠️ Admin-only Actions
router.put(
  "/:id/mark-paid",
  authenticate,
  authorizeRoles("admin"),
  validatePaymentIdParam,
  markPaymentAsPaid
);
router.put(
  "/:id/mark-failed",
  authenticate,
  authorizeRoles("admin"),
  validatePaymentIdParam,
  markPaymentAsFailed
);
router.put(
  "/:id/update-method",
  authenticate,
  authorizeRoles("admin"),
  validatePaymentIdParam,
  validatePaymentUpdateMethod,
  updatePaymentMethod
);

export default router;
