import express from "express";
import {
  createAboutCategory,
  getAllAboutCategories,
  getAboutCategoryById,
  updateAboutCategory,
  deleteAboutCategory,
} from "./aboutcategory.controller";
import {
  validateCreateAboutCategory,
  validateUpdateAboutCategory,
  validateObjectIdParam,
} from "./aboutcategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/About-categories
 * @desc    Create new category
 */
router.post("/", validateCreateAboutCategory, createAboutCategory);

/**
 * @route   GET /admin/About-categories
 * @desc    Get all categories
 */
router.get("/", getAllAboutCategories);

/**
 * @route   GET /admin/About-categories/:id
 * @desc    Get category by ID
 */
router.get("/:id", validateObjectIdParam, getAboutCategoryById);

/**
 * @route   PUT /admin/About-categories/:id
 * @desc    Update category
 */
router.put(
  "/:id",
  validateObjectIdParam,
  validateUpdateAboutCategory,
  updateAboutCategory
);

/**
 * @route   DELETE /admin/About-categories/:id
 * @desc    Delete category
 */
router.delete("/:id", validateObjectIdParam, deleteAboutCategory);

export default router;
