import express, { Request, Response, NextFunction } from "express";
import { getAllCategories, getCategoryById } from "./category.controller";
import { createCategory, updateCategory, deleteCategory } from "./admin.category.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import { createCategoryValidator, updateCategoryValidator } from "./category.validation";
import { validateRequest } from "@/core/middleware/validateRequest";

const router = express.Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "category";
    next();
  },
  upload.single("image"),
  createCategoryValidator,
  validateRequest,
  createCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "category";
    next();
  },
  upload.single("image"),
  updateCategoryValidator,
  validateRequest,
  updateCategory
);

router.delete("/:id", authenticate, authorizeRoles("admin"), deleteCategory);

export default router;
