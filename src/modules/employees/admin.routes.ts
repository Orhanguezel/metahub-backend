import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createEmployee,
  updateEmployee,
  adminGetAllEmployee,
  adminGetEmployeeById,
  deleteEmployee,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateAdminQuery,
} from "./validation";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator", "hr"));

// List
router.get("/", validateAdminQuery, adminGetAllEmployee);

// Detail
router.get("/:id", validateObjectId("id"), adminGetEmployeeById);

// Create
router.post("/", validateCreateEmployee, createEmployee);

// Update
router.put("/:id", validateObjectId("id"), validateUpdateEmployee, updateEmployee);

// Delete
router.delete("/:id", validateObjectId("id"), deleteEmployee);

export default router;
