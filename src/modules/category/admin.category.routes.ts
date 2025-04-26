import express from "express";
import { createCategory, updateCategory, deleteCategory } from "./admin.category.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.uploadType = "category";
    next();
  },
  upload.array("image", 1),
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
  upload.array("image", 1),
  updateCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteCategory
);

export default router;
