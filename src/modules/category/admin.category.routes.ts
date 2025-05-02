import express, { Request, Response, NextFunction } from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "./admin.category.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  createCategoryValidator,
  updateCategoryValidator,
} from "./category.validation";
import { validateRequest } from "@/core/middleware/validateRequest";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = express.Router();

// ✅ Admin-only routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  analyticsLogger,
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
  analyticsLogger,
  (req: Request, _res: Response, next: NextFunction) => {
    req.uploadType = "category";
    next();
  },
  upload.single("image"),
  updateCategoryValidator,
  validateRequest,
  updateCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  analyticsLogger,
  deleteCategory
);

export default router;
