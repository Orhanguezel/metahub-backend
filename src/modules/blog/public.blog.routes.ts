// src/modules/blog/public.blog.routes.ts
import express from "express";
import {
  getAllBlog,
  getBlogById,
  getBlogBySlug,
} from "./public.blog.controller";
import { validateObjectId } from "./blog.validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllBlog);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", validateObjectId("id"), getBlogById);

export default router;
