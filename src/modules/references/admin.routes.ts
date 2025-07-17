// src/modules/references/admin.references.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllReferences,
  adminGetReferencesById,
  updateReferences,
  deleteReferences,
  createReferences,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateReferences,
  validateUpdateReferences,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllReferences);

router.get("/:id", validateObjectId("id"), adminGetReferencesById);

router.post(
  "/",
  uploadTypeWrapper("references"),
  upload("references").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateReferences,
  createReferences
);

router.put(
  "/:id",
  uploadTypeWrapper("references"),
  upload("references").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateReferences,
  updateReferences
);

router.delete("/:id", validateObjectId("id"), deleteReferences);

export default router;
