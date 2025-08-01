// src/modules/services/admin.services.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllServices,
  adminGetServicesById,
  updateServices,
  deleteServices,
  createServices,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateServices,
  validateUpdateServices,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
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
  upload("services").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateServices,
  createServices
);

router.put(
  "/:id",
  uploadTypeWrapper("services"),
  upload("services").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateServices,
  updateServices
);

router.delete("/:id", validateObjectId("id"), deleteServices);

export default router;
