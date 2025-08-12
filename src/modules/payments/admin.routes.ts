import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createPayment,
  updatePayment,
  changePaymentStatus,
  adminGetPayments,
  adminGetPaymentById,
  deletePayment,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreatePayment,
  validateUpdatePayment,
  validateChangePaymentStatus,
  validatePaymentListQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List & detail
router.get("/", validatePaymentListQuery, adminGetPayments);
router.get("/:id", validateObjectId("id"), adminGetPaymentById);

// Create
router.post(
  "/",
  transformNestedFields([
    "payer",
    "instrument",
    "links",
    "fees",
    "allocations",
    "metadata",
  ]),
  validateCreatePayment,
  createPayment
);

// Update
router.put(
  "/:id",
  transformNestedFields([
    "payer",
    "instrument",
    "links",
    "fees",
    "allocations",
    "metadata",
  ]),
  validateObjectId("id"),
  validateUpdatePayment,
  updatePayment
);

// Status change
router.patch(
  "/:id/status",
  validateObjectId("id"),
  validateChangePaymentStatus,
  changePaymentStatus
);

// Delete
router.delete("/:id", validateObjectId("id"), deletePayment);

export default router;
