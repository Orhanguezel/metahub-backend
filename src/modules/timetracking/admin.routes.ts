import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllTimeEntry,
  adminGetTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "./admin.controller";

import {
  validateAdminQuery,
  validateCreateTimeEntry,
  validateObjectId,
  validateUpdateTimeEntry,
} from "./validation";

import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin-only
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateAdminQuery, adminGetAllTimeEntry);

// Detail
router.get("/:id", validateObjectId("id"), adminGetTimeEntryById);

// Create
router.post(
  "/",
  transformNestedFields([
    "geoIn", "geoOut",
    "deviceIn", "deviceOut",
    "breaks", "approvals",
    "payCode", "rounding",
  ]),
  validateCreateTimeEntry,
  createTimeEntry
);

// Update
router.put(
  "/:id",
  transformNestedFields([
    "geoIn", "geoOut",
    "deviceIn", "deviceOut",
    "breaks", "approvals",
    "payCode", "rounding",
  ]),
  validateObjectId("id"),
  validateUpdateTimeEntry,
  updateTimeEntry
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteTimeEntry);

export default router;
