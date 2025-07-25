import express from "express";
import {
  adminGetAllApartments,
  adminGetApartmentById,
  updateApartment,
  deleteApartment,
  createApartment,
} from "./admin.apartment.controller";

import {
  validateObjectId,
  validateCreateApartment,
  validateUpdateApartment,
  validateAdminApartmentQuery,
} from "./apartment.validation";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin erişim kontrolü
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 📥 Daire oluştur
router.post(
  "/",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 5),
  transformNestedFields(["title", "description", "tags"]),
  validateCreateApartment,
  createApartment
);

// 📝 Güncelle
router.put(
  "/:id",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 5),
  transformNestedFields(["title", "description", "tags"]),
  validateObjectId("id"),
  validateUpdateApartment,
  updateApartment
);

// 📄 Listeleme
router.get("/", validateAdminApartmentQuery, adminGetAllApartments);

// 🔍 Tekil getirme
router.get("/:id", validateObjectId("id"), adminGetApartmentById);

// 🗑 Silme
router.delete("/:id", validateObjectId("id"), deleteApartment);

export default router;
