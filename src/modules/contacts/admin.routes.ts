import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createContact,
  updateContact,
  adminGetAllContacts,
  adminGetContactById,
  deleteContact,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateContact,
  validateUpdateContact,
  validateContactsAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateContactsAdminQuery, adminGetAllContacts);

// Get by id
router.get("/:id", validateObjectId("id"), adminGetContactById);

// Create
router.post(
  "/",
  transformNestedFields(["emails", "phones", "addresses", "billing"]),
  validateCreateContact,
  createContact
);

// Update
router.put(
  "/:id",
  transformNestedFields(["emails", "phones", "addresses", "billing"]),
  validateObjectId("id"),
  validateUpdateContact,
  updateContact
);

// Delete
router.delete("/:id", validateObjectId("id"), deleteContact);

export default router;
