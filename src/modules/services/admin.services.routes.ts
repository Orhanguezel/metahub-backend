// src/modules/services/admin.services.routes.ts
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

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllServices);

router.get("/:id", validateObjectId("id"), adminGetServicesById);

router.post(
  "/",
  uploadTypeWrapper("services"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateServices,
  createServices
);

router.put(
  "/:id",
  uploadTypeWrapper("services"),
  upload.array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateServices,
  updateServices
);

router.delete("/:id", validateObjectId("id"), deleteServices);

export default router;
