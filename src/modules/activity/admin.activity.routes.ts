import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllActivity,
  adminGetActivityById,
  updateActivity,
  deleteActivity,
  createActivity,
} from "./admin.activity.controller";
import {
  validateObjectId,
  validateCreateActivity,
  validateUpdateActivity,
  validateAdminQuery,
} from "./activity.validation";
import {upload} from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin erişim kontrolü
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 Listeleme
router.get("/", validateAdminQuery, adminGetAllActivity);

// 🔍 Detay
router.get("/:id", validateObjectId("id"), adminGetActivityById);

// ➕ Oluşturma
router.post(
  "/",
  uploadTypeWrapper("activity"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateActivity,
  createActivity
);

// ✏️ Güncelleme
router.put(
  "/:id",
  uploadTypeWrapper("activity"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateActivity,
  updateActivity
);

// 🗑 Silme
router.delete("/:id", validateObjectId("id"), deleteActivity);

export default router;
