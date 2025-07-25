// src/modules/blog/admin.blog.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  adminGetAllBlog,
  adminGetBlogById,
  updateBlog,
  deleteBlog,
  createBlog,
} from "./admin.controller";

import {
  validateObjectId,
  validateCreateBlog,
  validateUpdateBlog,
  validateAdminQuery,
} from "./validation";

import { upload } from "@/core/middleware/file/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/file/uploadTypeWrapper";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🌟 Admin Middleware
router.use(authenticate, authorizeRoles("admin", "moderator"));

// 🌟 Admin Endpoints
router.get("/", validateAdminQuery, adminGetAllBlog);

router.get("/:id", validateObjectId("id"), adminGetBlogById);

router.post(
  "/",
  uploadTypeWrapper("blog"),
  upload("blog").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateCreateBlog,
  createBlog
);

router.put(
  "/:id",
  uploadTypeWrapper("blog"),
  upload("blog").array("images", 5),
  transformNestedFields(["title", "summary", "content", "tags"]),
  validateObjectId("id"),
  validateUpdateBlog,
  updateBlog
);

router.delete("/:id", validateObjectId("id"), deleteBlog);

export default router;
