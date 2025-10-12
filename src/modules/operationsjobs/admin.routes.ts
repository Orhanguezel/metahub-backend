import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminCreateJob,
  adminUpdateJob,
  adminGetAllJobs,
  adminGetJobById,
  adminDeleteJob,
} from "./admin.controller";
import { validateObjectId, validateCreateJob, validateUpdateJob, validateAdminQuery } from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator", "ops"));

// List
router.get("/", validateAdminQuery, adminGetAllJobs);

// Detail
router.get("/:id", validateObjectId("id"), adminGetJobById);

// Create
router.post(
  "/",
  // nested JSON sahaları parse:
  transformNestedFields([
    "title",
    "description",
    "schedule",
    "assignments",
    "steps",
    "materials",
    "deliverables",
    "finance",
    "tags",
  ]),
  validateCreateJob,
  adminCreateJob
);

// Update
router.put(
  "/:id",
  transformNestedFields([
    "title",
    "description",
    "schedule",
    "assignments",
    "steps",
    "materials",
    "deliverables",
    "finance",
    "tags",
  ]),
  validateObjectId("id"),
  validateUpdateJob,
  adminUpdateJob
);

// Delete
router.delete("/:id", validateObjectId("id"), adminDeleteJob);

export default router;
