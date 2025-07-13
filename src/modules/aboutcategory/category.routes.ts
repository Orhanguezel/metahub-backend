import express from "express";
import {
  createAboutCategory,
  getAllAboutCategories,
  getAboutCategoryById,
  updateAboutCategory,
  deleteAboutCategory,
} from "./category.controller";
import {
  validateCreateAboutCategory,
  validateUpdateAboutCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllAboutCategories);
router.get("/:id", validateObjectId("id"), getAboutCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateAboutCategory,
  createAboutCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateAboutCategory,
  updateAboutCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteAboutCategory
);

export default router;
