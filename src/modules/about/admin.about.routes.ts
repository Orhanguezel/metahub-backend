import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllAbout,
  adminGetAboutById,
  updateAbout,
  deleteAbout,
  createAbout,
} from "./admin.about.controller";
import {
  validateObjectId,
  validateCreateAbout,
  validateUpdateAbout,
  validateAdminQuery,
} from "./about.validation";
import upload from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin erişim kontrolü
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 Listeleme
router.get("/", validateAdminQuery, adminGetAllAbout);

// 🔍 Detay
router.get("/:id", validateObjectId("id"), adminGetAboutById);

// ➕ Oluşturma
router.post(
  "/",
  uploadTypeWrapper("about"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateAbout,
  createAbout
);

// ✏️ Güncelleme
router.put(
  "/:id",
  uploadTypeWrapper("about"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateAbout,
  updateAbout
);

// 🗑 Silme
router.delete("/:id", validateObjectId("id"), deleteAbout);

export default router;
