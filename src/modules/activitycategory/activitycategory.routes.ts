import express from "express";
import {
  createActivityCategory,
  getAllActivityCategories,
  getActivityCategoryById,
  updateActivityCategory,
  deleteActivityCategory,
} from "./activitycategory.controller";
import {
  validateCreateActivityCategory,
  validateUpdateActivityCategory,
  validateObjectIdParam,
} from "./activitycategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/Activity-categories
 * @desc    Create new category
 */
router.post(
  "/",
  analyticsLogger,
  validateCreateActivityCategory,
  createActivityCategory
);

/**
 * @route   GET /admin/Activity-categories
 * @desc    Get all categories
 */
router.get("/", analyticsLogger, getAllActivityCategories);

/**
 * @route   GET /admin/Activity-categories/:id
 * @desc    Get category by ID
 */
router.get(
  "/:id",
  analyticsLogger,
  validateObjectIdParam,
  getActivityCategoryById
);

/**
 * @route   PUT /admin/Activity-categories/:id
 * @desc    Update category
 */
router.put(
  "/:id",
  analyticsLogger,
  validateObjectIdParam,
  validateUpdateActivityCategory,
  updateActivityCategory
);

/**
 * @route   DELETE /admin/Activity-categories/:id
 * @desc    Delete category
 */
router.delete(
  "/:id",
  analyticsLogger,
  validateObjectIdParam,
  deleteActivityCategory
);

export default router;
