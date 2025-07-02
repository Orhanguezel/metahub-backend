import express from "express";
import {
  createReferencesCategory,
  getAllReferencesCategories,
  getReferencesCategoryById,
  updateReferencesCategory,
  deleteReferencesCategory,
} from "./category.controller";
import {
  validateCreateReferencesCategory,
  validateUpdateReferencesCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllReferencesCategories);
router.get("/:id", validateObjectId("id"), getReferencesCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateReferencesCategory,
  createReferencesCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateReferencesCategory,
  updateReferencesCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteReferencesCategory
);

export default router;
