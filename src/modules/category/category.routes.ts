import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// Public
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.uploadType = "category";
    next();
  },
  upload.single("image"),
  createCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.uploadType = "category";
    next();
  },
  upload.single("image"),
  updateCategory
);

router.delete("/:id", authenticate, authorizeRoles("admin"), deleteCategory);

export default router;
