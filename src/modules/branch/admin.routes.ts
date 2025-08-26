import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllBranch,
  adminGetBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateBranch,
  validateUpdateBranch,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateAdminQuery, adminGetAllBranch);

// Detail
router.get("/:id", validateObjectId("id"), adminGetBranchById);

// Create
router.post(
  "/",
  transformNestedFields(["name", "address", "location", "openingHours", "deliveryZones", "services"]),
  validateCreateBranch,
  createBranch
);

// Update
router.put(
  "/:id",
  transformNestedFields(["name", "address", "location", "openingHours", "deliveryZones", "services"]),
  validateObjectId("id"),
  validateUpdateBranch,
  updateBranch
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteBranch);

export default router;
