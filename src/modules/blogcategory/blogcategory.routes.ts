import express from "express";
import {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategoryById,
  updateBlogCategory,
  deleteBlogCategory,
} from "./blogcategory.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreateBlogCategory, validateUpdateBlogCategory, validateObjectId } from "./blogcategory.validation";

const router = express.Router();


router.get("/", getAllBlogCategories);
router.get("/:id", validateObjectId("id"), getBlogCategoryById);

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
