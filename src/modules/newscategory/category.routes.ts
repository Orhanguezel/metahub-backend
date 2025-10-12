import express from "express";
import {
  createNewsCategory,
  getAllNewsCategories,
  getNewsCategoryById,
  updateNewsCategory,
  deleteNewsCategory,
} from "./category.controller";
import {
  validateCreateNewsCategory,
  validateUpdateNewsCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllNewsCategories);
router.get("/:id", validateObjectId("id"), getNewsCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateNewsCategory,
  createNewsCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateNewsCategory,
  updateNewsCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteNewsCategory
);

export default router;
