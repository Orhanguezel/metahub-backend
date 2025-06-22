import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllServices,
  adminGetServicesById,
  updateServices,
  deleteServices,
  createServices,
} from "./admin.services.controller";
import {
  validateObjectId,
  validateCreateServices,
  validateUpdateServices,
  validateAdminQuery,
} from "./services.validation";
import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin erişim kontrolü
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🔍 Listeleme
router.get("/", validateAdminQuery, adminGetAllServices);

// 🔍 Detay
router.get("/:id", validateObjectId("id"), adminGetServicesById);

// ➕ Oluşturma
router.post(
  "/",
  uploadTypeWrapper("services"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateServices,
  createServices
);

// ✏️ Güncelleme
router.put(
  "/:id",
  uploadTypeWrapper("services"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateServices,
  updateServices
);

// 🗑 Silme
router.delete("/:id", validateObjectId("id"), deleteServices);

export default router;
