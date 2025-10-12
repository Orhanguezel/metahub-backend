// src/modules/massage/admin.massage.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllMassage,
  adminGetMassageById,
  updateMassage,
  deleteMassage,
  createMassage,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateMassage,
  validateUpdateMassage,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllMassage);

router.get("/:id", validateObjectId("id"), adminGetMassageById);

router.post(
  "/",
  uploadTypeWrapper("massage"),
  upload("massage").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateMassage,
  createMassage
);

router.put(
  "/:id",
  uploadTypeWrapper("massage"),
  upload("massage").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateMassage,
  updateMassage
);

router.delete("/:id", validateObjectId("id"), deleteMassage);

export default router;
