import express from "express";
import {
  createServicesCategory,
  getAllServicesCategories,
  getServicesCategoryById,
  updateServicesCategory,
  deleteServicesCategory,
} from "./category.controller";
import {
  validateCreateServicesCategory,
  validateUpdateServicesCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllServicesCategories);
router.get("/:id", validateObjectId("id"), getServicesCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateServicesCategory,
  createServicesCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateServicesCategory,
  updateServicesCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteServicesCategory
);

export default router;
