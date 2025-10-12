import express from "express";
import {
  createReferencesCategory,
  getAllReferencesCategories,
  getReferencesCategoryById,
  getReferencesCategoryBySlug,   // NEW
  updateReferencesCategory,
  deleteReferencesCategory,
} from "./category.controller";
import {
  validateCreateReferencesCategory,
  validateUpdateReferencesCategory,
  validateObjectId,
} from "./validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

/* 🌿 Public */
router.get("/", getAllReferencesCategories);
router.get("/slug/:slug", getReferencesCategoryBySlug); // NEW — slug ile
router.get("/:id", validateObjectId("id"), getReferencesCategoryById);

/* 🔐 Admin */
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
