import express from "express";
import {
  createAboutusCategory,
  getAllAboutusCategories,
  getAboutusCategoryById,
  updateAboutusCategory,
  deleteAboutusCategory,
} from "./category.controller";
import {
  validateCreateAboutusCategory,
  validateUpdateAboutusCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllAboutusCategories);
router.get("/:id", validateObjectId("id"), getAboutusCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateAboutusCategory,
  createAboutusCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateAboutusCategory,
  updateAboutusCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteAboutusCategory
);

export default router;
