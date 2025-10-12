import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllExpense,
  adminGetExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateExpense,
  validateUpdateExpense,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator", "finance"));

// List
router.get("/", validateAdminQuery, adminGetAllExpense);

// Detail
router.get("/:id", validateObjectId("id"), adminGetExpenseById);

// Create
router.post(
  "/",
  // body içinden JSON string gelebilir; normalize et
  transformNestedFields(["lines", "attachments", "approvals", "tags", "paymentRefs"]),
  validateCreateExpense,
  createExpense
);

// Update
router.put(
  "/:id",
  transformNestedFields(["lines", "attachments", "approvals", "tags", "paymentRefs"]),
  validateObjectId("id"),
  validateUpdateExpense,
  updateExpense
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteExpense);

export default router;
