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

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/", validateCreateBlogCategory, createBlogCategory);

router.get("/", getAllBlogCategories);

router.get("/:id", validateObjectIdParam, getBlogCategoryById);

router.put("/:id", validateObjectIdParam, validateUpdateBlogCategory, updateBlogCategory);

router.delete("/:id", validateObjectIdParam, deleteBlogCategory);

export default router;
