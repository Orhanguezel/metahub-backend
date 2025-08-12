import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createReportDefinition,
  updateReportDefinition,
  adminGetAllReportDefinitions,
  adminGetReportDefinitionById,
  deleteReportDefinition,
  createReportRun,
  adminGetAllReportRuns,
  adminGetReportRunById,
  deleteReportRun,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateDefinition,
  validateUpdateDefinition,
  validateDefinitionListQuery,
  validateCreateRun,
  validateRunListQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* ----- Definitions ----- */
router.get(
  "/definitions",
  validateDefinitionListQuery,
  adminGetAllReportDefinitions
);

router.get(
  "/definitions/:id",
  validateObjectId("id"),
  adminGetReportDefinitionById
);

router.post(
  "/definitions",
  // JSON -> object
  transformNestedFields(["defaultFilters", "view", "schedule", "tags"]),
  validateCreateDefinition,
  createReportDefinition
);

router.put(
  "/definitions/:id",
  transformNestedFields(["defaultFilters", "view", "schedule", "tags"]),
  validateObjectId("id"),
  validateUpdateDefinition,
  updateReportDefinition
);

router.delete(
  "/definitions/:id",
  validateObjectId("id"),
  deleteReportDefinition
);

/* ----- Runs ----- */
router.get(
  "/runs",
  validateRunListQuery,
  adminGetAllReportRuns
);

router.get(
  "/runs/:id",
  validateObjectId("id"),
  adminGetReportRunById
);

router.post(
  "/runs",
  transformNestedFields(["filtersUsed"]),
  validateCreateRun,
  createReportRun
);

router.delete(
  "/runs/:id",
  validateObjectId("id"),
  deleteReportRun
);

export default router;
