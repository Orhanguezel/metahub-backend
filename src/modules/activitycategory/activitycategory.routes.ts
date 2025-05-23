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

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/Activity-categories
 * @desc    Create new category
 */
router.post(
  "/",
  validateCreateActivityCategory,
  createActivityCategory
);

/**
 * @route   GET /admin/Activity-categories
 * @desc    Get all categories
 */
router.get("/", getAllActivityCategories);

/**
 * @route   GET /admin/Activity-categories/:id
 * @desc    Get category by ID
 */
router.get(
  "/:id",
  validateObjectIdParam,
  getActivityCategoryById
);

/**
 * @route   PUT /admin/Activity-categories/:id
 * @desc    Update category
 */
router.put(
  "/:id",
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
  validateObjectIdParam,
  deleteActivityCategory
);

export default router;
