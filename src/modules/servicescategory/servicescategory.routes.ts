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
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/services-categories
 * @desc    Create new category
 */
router.post("/", analyticsLogger, validateCreateServicesCategory, createServicesCategory);

/**
 * @route   GET /admin/services-categories
 * @desc    Get all categories
 */
router.get("/", analyticsLogger, getAllServicesCategories);

/**
 * @route   GET /admin/services-categories/:id
 * @desc    Get category by ID
 */
router.get("/:id", analyticsLogger, validateObjectIdParam, getServicesCategoryById);

/**
 * @route   PUT /admin/services-categories/:id
 * @desc    Update category
 */
router.put("/:id", analyticsLogger, validateObjectIdParam, validateUpdateServicesCategory, updateServicesCategory);

/**
 * @route   DELETE /admin/services-categories/:id
 * @desc    Delete category
 */
router.delete("/:id", analyticsLogger, validateObjectIdParam, deleteServicesCategory);

export default router;
