// src/modules/activity/admin.activity.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllActivity,
  adminGetActivityById,
  updateActivity,
  deleteActivity,
  createActivity,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateActivity,
  validateUpdateActivity,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllActivity);

router.get("/:id", validateObjectId("id"), adminGetActivityById);

router.post(
  "/",
  uploadTypeWrapper("activity"),
  upload("activity").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateActivity,
  createActivity
);

router.put(
  "/:id",
  uploadTypeWrapper("activity"),
  upload("activity").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateActivity,
  updateActivity
);

router.delete("/:id", validateObjectId("id"), deleteActivity);

export default router;
