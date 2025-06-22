import express from "express";
import {
  createServicesCategory,
  getAllServicesCategories,
  getServicesCategoryById,
  updateServicesCategory,
  deleteServicesCategory,
} from "./servicescategory.controller";
import {
  validateCreateServicesCategory,
  validateUpdateServicesCategory,
  validateObjectIdParam,
} from "./servicescategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/services-categories
 * @desc    Create new category
 */
router.post("/", validateCreateServicesCategory, createServicesCategory);

/**
 * @route   GET /admin/services-categories
 * @desc    Get all categories
 */
router.get("/", getAllServicesCategories);

/**
 * @route   GET /admin/services-categories/:id
 * @desc    Get category by ID
 */
router.get("/:id", validateObjectIdParam, getServicesCategoryById);

/**
 * @route   PUT /admin/services-categories/:id
 * @desc    Update category
 */
router.put(
  "/:id",
  validateObjectIdParam,
  validateUpdateServicesCategory,
  updateServicesCategory
);

/**
 * @route   DELETE /admin/services-categories/:id
 * @desc    Delete category
 */
router.delete("/:id", validateObjectIdParam, deleteServicesCategory);

export default router;
