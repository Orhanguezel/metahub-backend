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

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

// 🔓 Public: Yayınlanmış medya
router.get("/published", getPublishedGalleryItems);

// 🔐 Admin: Tüm medya öğeleri
router.get("/", authenticate, authorizeRoles("admin"), getAllGalleryItems);

// 🔐 Admin: Medya yükle
router.post(
  "/upload",
  authenticate,
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.uploadType = "gallery";
    next();
  },
  upload.array("images", 5),
  uploadGalleryItem
);

// 🔐 Admin: Yayın durumunu değiştir
router.patch(
  "/:id/toggle",
  authenticate,
  authorizeRoles("admin"),
  togglePublishGalleryItem
);

// 🔐 Admin: Medya güncelle
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  updateGalleryItem
);

// 🔐 Admin: Soft delete (arşivle)
router.patch(
  "/:id/archive",
  authenticate,
  authorizeRoles("admin"),
  softDeleteGalleryItem
);

// 🔐 Admin: Kalıcı silme
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteGalleryItem
);

export default router;
