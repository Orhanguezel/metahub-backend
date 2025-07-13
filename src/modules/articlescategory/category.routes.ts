import express from "express";
import {
  createArticlesCategory,
  getAllArticlesCategories,
  getArticlesCategoryById,
  updateArticlesCategory,
  deleteArticlesCategory,
} from "./category.controller";
import {
  validateCreateArticlesCategory,
  validateUpdateArticlesCategory,
  validateObjectId,
} from "./category.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllArticlesCategories);
router.get("/:id", validateObjectId("id"), getArticlesCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateArticlesCategory,
  createArticlesCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateArticlesCategory,
  updateArticlesCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteArticlesCategory
);

export default router;
