import express from "express";
import {
  uploadGalleryItem,
  getAllGalleryItems,
  deleteGalleryItem,
} from "./gallery.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";
import upload from "../../core/middleware/uploadMiddleware";

const router = express.Router();

router.get("/", getAllGalleryItems);

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

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteGalleryItem
);

export default router;
