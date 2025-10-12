import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllLibrary,
  adminGetLibraryById,
  updateLibrary,
  deleteLibrary,
  createLibrary,
  incrementLibraryDownloadCount,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateLibrary,
  validateUpdateLibrary,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
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
  upload("library").fields([
    { name: "images", maxCount: 8 },
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
    { name: "images", maxCount: 8 },
    { name: "files", maxCount: 10 },
  ]),
  transformNestedFields([
    "title",
    "summary",
    "content",
    "tags",
    // ↓ silme/sıralama alanları
    "removedImages",
    "removedFiles",
    "removeImageIds",
    "removedImageIds",
    "existingImagesOrderIds",
    "existingImagesOrder",
  ]),
  validateObjectId("id"),
  validateUpdateLibrary,
  updateLibrary
);

router.delete("/:id", validateObjectId("id"), deleteLibrary);

router.post("/:id/increment-download", validateObjectId("id"), incrementLibraryDownloadCount);

export default router;
