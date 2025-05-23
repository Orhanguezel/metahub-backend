import express from "express";
import {
  createReferenceCategory,
  getAllReferenceCategories,
  getReferenceCategoryById,
  updateReferenceCategory,
  deleteReferenceCategory,
} from "./category.controller";
import {
  validateCreateReferenceCategory,
  validateUpdateReferenceCategory,
  validateObjectIdParam,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/referencescategory
 */
router.post("/", validateCreateReferenceCategory, createReferenceCategory);

/**
 * @route   GET /admin/referencescategory
 */
router.get("/", getAllReferenceCategories);

/**
 * @route   GET /admin/referencescategory/:id
 */
router.get("/:id", validateObjectIdParam, getReferenceCategoryById);

/**
 * @route   PUT /admin/referencescategory/:id
 */
router.put(
  "/:id",
  validateObjectIdParam,
  validateUpdateReferenceCategory,
  updateReferenceCategory
);

/**
 * @route   DELETE /admin/referencescategory/:id
 */
router.delete("/:id", validateObjectIdParam, deleteReferenceCategory);

export default router;
