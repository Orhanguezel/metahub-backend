import express from "express";
import {
  createGalleryCategory,
  getAllGalleryCategories,
  getGalleryCategoryById,
  updateGalleryCategory,
  deleteGalleryCategory,
} from "./gallerycategory.controller";
import {
  validateCreateGalleryCategory,
  validateUpdateGalleryCategory,
  validateObjectId,
} from "./gallerycategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🌿 Public Routes
router.get("/", getAllGalleryCategories);
router.get("/:id", validateObjectId("id"), getGalleryCategoryById);

// 🔐 Admin Routes
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validateCreateGalleryCategory,
  createGalleryCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  validateUpdateGalleryCategory,
  updateGalleryCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteGalleryCategory
);

export default router;
