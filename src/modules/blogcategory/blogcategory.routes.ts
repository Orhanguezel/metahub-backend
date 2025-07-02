import express from "express";
import {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategoryById,
  updateBlogCategory,
  deleteBlogCategory,
} from "./blogcategory.controller";
import {
  validateCreateBlogCategory,
  validateUpdateBlogCategory,
  validateObjectId,
} from "./blogcategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllBlogCategories);
router.get("/:id", validateObjectId("id"), getBlogCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateBlogCategory,
  createBlogCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateBlogCategory,
  updateBlogCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteBlogCategory
);

export default router;
