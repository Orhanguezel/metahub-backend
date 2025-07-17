import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/checkFileSizeMiddleware";
import {
  validateUploadGallery,
  validateGalleryIdParam,
} from "./gallery.validation";

import * as publicController from "./gallery.public.controller";
import * as adminController from "./gallery.admin.controller";

const router = express.Router();

// 🔓 Public routes
// Get all published gallery items with pagination and filters
router.get("/published", publicController.getPublishedGalleryItems);

// Search gallery items with filters
router.get("/search", publicController.searchGalleryItems);

// Get stats related to gallery items
router.get("/stats", publicController.getGalleryStats);

// Get all categories with published gallery items
router.get("/categories", publicController.getPublishedGalleryItemsByCategory);

// 🛡️ Important: place this at the END to avoid route collisions
// Get a single gallery item by ID
router.get("/:id", publicController.getGalleryItemById);

// 🔐 Admin routes
router.use(authenticate, authorizeRoles("admin"));

// Admin: Get all gallery items with pagination
router.get("/", adminController.getAllGalleryItems);

// Admin: Upload new gallery items (image/video)
router.post(
  "/upload",
  uploadTypeWrapper("gallery"),
  upload.array("images",10),
  checkFileSizeMiddleware,
  validateUploadGallery,
  adminController.createGalleryItem
);

// Admin: Update an existing gallery item by ID
router.put(
  "/:id",
  uploadTypeWrapper("gallery"),
  upload.array("images",10),
  checkFileSizeMiddleware,
  validateGalleryIdParam,
  adminController.updateGalleryItem
);

// Admin: Toggle publish status for a gallery item
router.patch(
  "/:id/toggle",
  validateGalleryIdParam,
  adminController.togglePublishGalleryItem
);

// Admin: Archive (soft delete) a gallery item
router.patch(
  "/:id/archive",
  validateGalleryIdParam,
  adminController.softDeleteGalleryItem
);

// Admin: Delete a gallery item permanently
router.delete(
  "/:id",
  validateGalleryIdParam,
  adminController.deleteGalleryItem
);

// Admin: Restore a soft-deleted gallery item
router.patch(
  "/:id/restore",
  validateGalleryIdParam,
  adminController.updateGalleryItem
);

// Admin: Batch publish/unpublish gallery items
router.patch("/batch/publish", adminController.batchPublishGalleryItems);

// Admin: Batch delete gallery items permanently
router.delete("/batch", adminController.batchDeleteGalleryItems);

export default router;
