import express from "express";
import {
  createApartmentCategory,
  getAllApartmentCategories,
  getApartmentCategoryById,
  updateApartmentCategory,
  deleteApartmentCategory,
} from "./apartmentcategory.controller";
import {
  validateCreateApartmentCategory,
  validateUpdateApartmentCategory,
  validateObjectIdParam,
} from "./apartmentcategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

/**
 * @route   POST /admin/Apartment-categories
 * @desc    Create new category
 */
router.post(
  "/",
  validateCreateApartmentCategory,
  createApartmentCategory
);

/**
 * @route   GET /admin/Apartment-categories
 * @desc    Get all categories
 */
router.get("/", getAllApartmentCategories);

/**
 * @route   GET /admin/Apartment-categories/:id
 * @desc    Get category by ID
 */
router.get(
  "/:id",
  validateObjectIdParam,
  getApartmentCategoryById
);

/**
 * @route   PUT /admin/Apartment-categories/:id
 * @desc    Update category
 */
router.put(
  "/:id",
  validateObjectIdParam,
  validateUpdateApartmentCategory,
  updateApartmentCategory
);

/**
 * @route   DELETE /admin/Apartment-categories/:id
 * @desc    Delete category
 */
router.delete(
  "/:id",
  validateObjectIdParam,
  deleteApartmentCategory
);

export default router;
