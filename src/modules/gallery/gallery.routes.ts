import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/file/checkFileSizeMiddleware";

import * as publicController from "./gallery.public.controller";
import * as adminController from "./gallery.admin.controller";

import {
  validateCreateGallery,
  validateUpdateGallery,
  validateObjectId,
  validateAdminQuery,
  validatePublicQuery,
} from "./gallery.validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* 🔓 Public */
router.get("/published", validatePublicQuery, publicController.getPublishedGalleryItems);
router.get("/search", publicController.searchGalleryItems);
router.get("/stats", publicController.getGalleryStats);
router.get("/categories", publicController.getGalleryCategories);
router.get("/category/:category", publicController.getPublishedGalleryItemsByCategory);
// tekil
router.get("/:id", publicController.getGalleryItemById);

/* 🔐 Admin */
router.use(authenticate, authorizeRoles("admin"));

router.get("/", validateAdminQuery, adminController.getAllGalleryItems);

router.post(
  "/upload",
  uploadTypeWrapper("gallery"),
  upload("gallery").array("images", 30),
  checkFileSizeMiddleware,
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateGallery,
  adminController.createGalleryItem
);

router.put(
  "/:id",
  uploadTypeWrapper("gallery"),
  upload("gallery").array("images", 30),
  checkFileSizeMiddleware,
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateGallery,
  adminController.updateGalleryItem
);

router.patch("/:id/toggle", validateObjectId("id"), adminController.togglePublishGalleryItem);
router.patch("/:id/archive", validateObjectId("id"), adminController.softDeleteGalleryItem);
router.patch("/:id/restore", validateObjectId("id"), adminController.restoreGalleryItem);

router.delete("/:id", validateObjectId("id"), adminController.deleteGalleryItem);

router.patch("/batch/publish", adminController.batchPublishGalleryItems);
router.delete("/batch", adminController.batchDeleteGalleryItems);

export default router;
