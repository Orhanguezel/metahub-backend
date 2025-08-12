import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllApartment,
  adminGetApartmentById,
  updateApartment,
  deleteApartment,
  createApartment,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateApartment,
  validateUpdateApartment,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllApartment);

router.get("/:id", validateObjectId("id"), adminGetApartmentById);

router.post(
  "/",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 10),
  // JSON -> object: v2 (services/fees kaldırıldı, location eklendi)
  transformNestedFields(["title", "content", "address", "contact", "location"]),
  validateCreateApartment,
  createApartment
);

router.put(
  "/:id",
  uploadTypeWrapper("apartment"),
  upload("apartment").array("images", 10),
  transformNestedFields(["title", "content", "address", "contact", "location"]),
  validateObjectId("id"),
  validateUpdateApartment,
  updateApartment
);

router.delete("/:id", validateObjectId("id"), deleteApartment);

export default router;
