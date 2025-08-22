import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/file/checkFileSizeMiddleware";
import * as adminController from "./admin.controller";
import {
  validateCreateGallery,
  validateUpdateGallery,
  validateObjectId,
  validateAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

/* 🔐 Admin (korumalı) */
router.use(authenticate, authorizeRoles("admin"));

/* Liste */
router.get("/", validateAdminQuery, adminController.getAllGalleryItems);

/* Tekil (Admin) – isActive/isPublished filtresi yok */
router.get(
  "/:id([0-9a-fA-F]{24})",
  validateObjectId("id"),
  adminController.getGalleryItemByIdAdmin // ← admin controller’da mevcut
);

/* Oluştur */
router.post(
  "/upload",
  uploadTypeWrapper("gallery"),
  upload("gallery").array("images", 30),
  checkFileSizeMiddleware,
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateGallery,
  adminController.createGalleryItem
);

/* ✅ Batch rotaları parametreli rotalardan önce */
router.patch("/batch/publish", adminController.batchPublishGalleryItems);
router.delete("/batch", adminController.batchDeleteGalleryItems);

/* Güncelle */
router.put(
  "/:id([0-9a-fA-F]{24})",
  uploadTypeWrapper("gallery"),
  upload("gallery").array("images", 30),
  checkFileSizeMiddleware,
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateGallery,
  adminController.updateGalleryItem
);

/* Toggle / Archive / Restore */
router.patch("/:id([0-9a-fA-F]{24})/toggle", validateObjectId("id"), adminController.togglePublishGalleryItem);
router.patch("/:id([0-9a-fA-F]{24})/archive", validateObjectId("id"), adminController.softDeleteGalleryItem);
router.patch("/:id([0-9a-fA-F]{24})/restore", validateObjectId("id"), adminController.restoreGalleryItem);

/* Sil */
router.delete("/:id([0-9a-fA-F]{24})", validateObjectId("id"), adminController.deleteGalleryItem);

export default router;
