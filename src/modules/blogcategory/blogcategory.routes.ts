import express from "express";
import {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategoryById,
  updateBlogCategory,
  deleteBlogCategory,
} from "./blogcategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateBlogCategory, validateUpdateBlogCategory, validateObjectIdParam } from "./blogcategory.validation";
import { analyticsLogger } from "@/core/middleware/analyticsLogger"; // ✅ Eklendi

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create Category
router.post("/", analyticsLogger, validateCreateBlogCategory, createBlogCategory);

// 📝 Get All Categories
router.get("/", analyticsLogger, getAllBlogCategories);

// 🔍 Get Single Category
router.get("/:id", analyticsLogger, validateObjectIdParam, getBlogCategoryById);

// ✏️ Update Category
router.put("/:id", analyticsLogger, validateObjectIdParam, validateUpdateBlogCategory, updateBlogCategory);

// 🗑️ Delete Category
router.delete("/:id", analyticsLogger, validateObjectIdParam, deleteBlogCategory);

export default router;
