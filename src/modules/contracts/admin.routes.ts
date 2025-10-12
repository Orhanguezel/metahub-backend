import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetContracts,
  adminGetContractById,
  createContract,
  updateContract,
  changeContractStatus,
  deleteContract,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateContract,
  validateUpdateContract,
  validateChangeContractStatus,
  validateContractListQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator"));

// List
router.get("/", validateContractListQuery, adminGetContracts);

// Detail
router.get("/:id", validateObjectId("id"), adminGetContractById);

// Create
router.post(
  "/",
  transformNestedFields(["title", "description", "parties", "lines", "billing"]),
  validateCreateContract,
  createContract
);

// Update
router.put(
  "/:id",
  transformNestedFields(["title", "description", "parties", "lines", "billing"]),
  validateObjectId("id"),
  validateUpdateContract,
  updateContract
);

// Status change
router.patch("/:id/status", validateObjectId("id"), validateChangeContractStatus, changeContractStatus);

// Delete
router.delete("/:id", validateObjectId("id"), deleteContract);

export default router;
