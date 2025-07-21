// src/modules/library/admin.library.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllLibrary,
  adminGetLibraryById,
  updateLibrary,
  deleteLibrary,
  createLibrary,
  incrementLibraryDownloadCount, // YENİ
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateLibrary,
  validateUpdateLibrary,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllLibrary);

router.get("/:id", validateObjectId("id"), adminGetLibraryById);

router.post(
  "/",
  uploadTypeWrapper("library"),
  // Çoklu upload: images + files (aynı anda destekli)
  upload("library").fields([
    { name: "images", maxCount: 5 },
    { name: "files", maxCount: 10 },
  ]),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateLibrary,
  createLibrary
);

router.put(
  "/:id",
  uploadTypeWrapper("library"),
  upload("library").fields([
    { name: "images", maxCount: 5 },
    { name: "files", maxCount: 10 },
  ]),
  transformNestedFields(["title", "summary", "content", "tags", "removedImages", "removedFiles"]),
  validateObjectId("id"),
  validateUpdateLibrary,
  updateLibrary
);

router.delete("/:id", validateObjectId("id"), deleteLibrary);

// 🌟 Download sayacı public endpoint (isteğe bağlı, gerekirse authenticate eklenebilir)
router.post(
  "/:id/increment-download",
  validateObjectId("id"),
  incrementLibraryDownloadCount
);

export default router;
