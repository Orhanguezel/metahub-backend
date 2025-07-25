// src/modules/articles/admin.articles.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllArticles,
  adminGetArticlesById,
  updateArticles,
  deleteArticles,
  createArticles,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateArticles,
  validateUpdateArticles,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllArticles);

router.get("/:id", validateObjectId("id"), adminGetArticlesById);

router.post(
  "/",
  uploadTypeWrapper("articles"),
  upload("articles").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateArticles,
  createArticles
);

router.put(
  "/:id",
  uploadTypeWrapper("articles"),
  upload("articles").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateArticles,
  updateArticles
);

router.delete("/:id", validateObjectId("id"), deleteArticles);

export default router;
