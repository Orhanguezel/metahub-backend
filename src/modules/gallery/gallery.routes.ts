import express from "express";
import {
  uploadGalleryItem,
  getAllGalleryItems,
  getPublishedGalleryItems,
  deleteGalleryItem,
  togglePublishGalleryItem,
  softDeleteGalleryItem,
  updateGalleryItem,
} from "./gallery.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import {
  validateUploadGallery,
  validateGalleryIdParam,
} from "./gallery.validation";

const router = express.Router();

// 🔓 Public
router.get("/published", getPublishedGalleryItems);

// 🔐 Admin
router.use(authenticate, authorizeRoles("admin"));

router.get("/", getAllGalleryItems);

router.post(
  "/upload",
  validateUploadGallery,
  (req, _res, next) => {
    req.uploadType = "gallery";
    next();
  },
  upload.array("images", 5),
  uploadGalleryItem
);

router.patch("/:id/toggle", validateGalleryIdParam, togglePublishGalleryItem);
router.put("/:id", validateGalleryIdParam, updateGalleryItem);
router.patch("/:id/archive", validateGalleryIdParam, softDeleteGalleryItem);
router.delete("/:id", validateGalleryIdParam, deleteGalleryItem);

export default router;
