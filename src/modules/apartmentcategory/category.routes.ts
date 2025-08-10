import express from "express";
import {
  createApartmentCategory,
  getAllApartmentCategories,
  getApartmentCategoryById,
  updateApartmentCategory,
  deleteApartmentCategory,
} from "./category.controller";
import {
  validateCreateApartmentCategory,
  validateUpdateApartmentCategory,
  validateObjectId,
  validateCategoryQuery, // ⬅️ yeni
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", validateCategoryQuery, getAllApartmentCategories);
router.get("/:id", validateObjectId("id"), getApartmentCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateApartmentCategory,
  createApartmentCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateApartmentCategory,
  updateApartmentCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteApartmentCategory
);

export default router;
