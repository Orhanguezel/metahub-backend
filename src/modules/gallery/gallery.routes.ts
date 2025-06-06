import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {upload} from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/checkFileSizeMiddleware";
import { validateUploadGallery, validateGalleryIdParam } from "./gallery.validation";

import * as publicController from "./gallery.public.controller";
import * as adminController from "./gallery.admin.controller";

const router = express.Router();

// 🔓 Public routes
router.get("/published", publicController.getPublishedGalleryItems);
router.get("/search", publicController.searchGalleryItems);
router.get("/stats", publicController.getGalleryStats);

// 🛡️ Important: place this at the END to avoid route collisions
router.get("/:id", publicController.getGalleryItemById);

// 🔐 Admin routes
router.use(authenticate, authorizeRoles("admin"));

router.get("/", adminController.getAllGalleryItems);

router.post(
  "/upload",
  uploadTypeWrapper("gallery"),
  upload.array("images"),
  checkFileSizeMiddleware,
  validateUploadGallery,
  adminController.uploadGalleryItem
);

router.put(
  "/:id",
  uploadTypeWrapper("gallery"),
  upload.array("images"),
  checkFileSizeMiddleware,
  validateGalleryIdParam,
  adminController.updateGalleryItem
);

router.patch("/:id/toggle", validateGalleryIdParam, adminController.togglePublishGalleryItem);
router.patch("/:id/archive", validateGalleryIdParam, adminController.softDeleteGalleryItem);
router.delete("/:id", validateGalleryIdParam, adminController.deleteGalleryItem);
router.patch("/:id/restore", validateGalleryIdParam, adminController.restoreGalleryItem);

router.patch("/batch/publish", adminController.batchPublishGalleryItems);
router.delete("/batch", adminController.batchDeleteGalleryItems);

export default router;
