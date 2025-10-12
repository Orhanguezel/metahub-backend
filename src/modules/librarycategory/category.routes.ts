import express from "express";
import {
  createLibraryCategory,
  getAllLibraryCategories,
  getLibraryCategoryById,
  updateLibraryCategory,
  deleteLibraryCategory,
} from "./category.controller";
import {
  validateCreateLibraryCategory,
  validateUpdateLibraryCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllLibraryCategories);
router.get("/:id", validateObjectId("id"), getLibraryCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateLibraryCategory,
  createLibraryCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateLibraryCategory,
  updateLibraryCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteLibraryCategory
);

export default router;
