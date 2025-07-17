// src/modules/about/admin.about.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllAbout,
  adminGetAboutById,
  updateAbout,
  deleteAbout,
  createAbout,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateAbout,
  validateUpdateAbout,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllAbout);

router.get("/:id", validateObjectId("id"), adminGetAboutById);

router.post(
  "/",
  uploadTypeWrapper("about"),
  upload("about").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateAbout,
  createAbout
);

router.put(
  "/:id",
  uploadTypeWrapper("about"),
  upload("about").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateAbout,
  updateAbout
);

router.delete("/:id", validateObjectId("id"), deleteAbout);

export default router;
