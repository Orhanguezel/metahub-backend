// src/modules/news/admin.news.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminGetAllNews,
  adminGetNewsById,
  updateNews,
  deleteNews,
  createNews,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateNews,
  validateUpdateNews,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllNews);

router.get("/:id", validateObjectId("id"), adminGetNewsById);

router.post(
  "/",
  uploadTypeWrapper("news"),
  upload("news").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateNews,
  createNews
);

router.put(
  "/:id",
  uploadTypeWrapper("news"),
  upload("news").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateNews,
  updateNews
);

router.delete("/:id", validateObjectId("id"), deleteNews);

export default router;
