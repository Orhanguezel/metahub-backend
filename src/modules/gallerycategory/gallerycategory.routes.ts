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
  validateObjectIdParam,
} from "./gallerycategory.validation";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

// 🔐 Admin Auth Middleware
router.use(authenticate, authorizeRoles("admin"));

router.post("/", validateCreateGalleryCategory, createGalleryCategory);


router.get("/", getAllGalleryCategories);


router.get("/:id", validateObjectIdParam, getGalleryCategoryById);

router.put(
  "/:id",
  validateObjectIdParam,
  validateUpdateGalleryCategory,
  updateGalleryCategory
);
router.delete("/:id", validateObjectIdParam, deleteGalleryCategory);

export default router;
