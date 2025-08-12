import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllOperationTemplate,
  adminGetOperationTemplateById,
  createOperationTemplate,
  updateOperationTemplate,
  deleteOperationTemplate,
} from "./admin.controller";
import {
  validateAdminQuery,
  validateCreateOperationTemplate,
  validateObjectId,
  validateUpdateOperationTemplate,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin auth
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateAdminQuery, adminGetAllOperationTemplate);

// Detail
router.get("/:id", validateObjectId("id"), adminGetOperationTemplateById);

// Create
router.post(
  "/",
  // JSON -> object (standart)
  transformNestedFields([
    "name",
    "description",
    "crew",
    "steps",
    "materials",
    "deliverables",
    "recurrence",
    "applicability",
    "tags",
  ]),
  validateCreateOperationTemplate,
  createOperationTemplate
);

// Update
router.put(
  "/:id",
  transformNestedFields([
    "name",
    "description",
    "crew",
    "steps",
    "materials",
    "deliverables",
    "recurrence",
    "applicability",
    "tags",
  ]),
  validateObjectId("id"),
  validateUpdateOperationTemplate,
  updateOperationTemplate
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteOperationTemplate);

export default router;
