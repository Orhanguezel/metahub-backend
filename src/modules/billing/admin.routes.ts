import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createBillingPlan,
  updateBillingPlan,
  changeBillingPlanStatus,
  adminGetBillingPlans,
  adminGetBillingPlanById,
  deleteBillingPlan,
  createBillingOccurrence,
  updateBillingOccurrence,
  adminGetBillingOccurrences,
  adminGetBillingOccurrenceById,
  deleteBillingOccurrence,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreatePlan,
  validateUpdatePlan,
  validatePlanListQuery,
  validateChangePlanStatus,
  validateCreateOccurrence,
  validateUpdateOccurrence,
  validateOccurrenceListQuery,
} from "./validation";

import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* ============== Plans ============== */
router.get("/plans", validatePlanListQuery, adminGetBillingPlans);
router.get("/plans/:id", validateObjectId("id"), adminGetBillingPlanById);

router.post(
  "/plans",
  transformNestedFields(["source", "schedule", "notes", "revisions"]),
  validateCreatePlan,
  createBillingPlan
);

router.put(
  "/plans/:id",
  transformNestedFields(["source", "schedule", "notes", "revisions"]),
  validateObjectId("id"),
  validateUpdatePlan,
  updateBillingPlan
);

router.patch(
  "/plans/:id/status",
  validateObjectId("id"),
  validateChangePlanStatus,
  changeBillingPlanStatus
);

router.delete("/plans/:id", validateObjectId("id"), deleteBillingPlan);

/* ============ Occurrences =========== */
router.get("/occurrences", validateOccurrenceListQuery, adminGetBillingOccurrences);
router.get("/occurrences/:id", validateObjectId("id"), adminGetBillingOccurrenceById);

router.post(
  "/occurrences",
  transformNestedFields(["notes"]),
  validateCreateOccurrence,
  createBillingOccurrence
);

router.patch(
  "/occurrences/:id",
  transformNestedFields(["notes"]),
  validateObjectId("id"),
  validateUpdateOccurrence,
  updateBillingOccurrence
);

router.delete("/occurrences/:id", validateObjectId("id"), deleteBillingOccurrence);

export default router;
