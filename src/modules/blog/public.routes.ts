// src/modules/blog/public.blog.routes.ts
import express from "express";
import { getAllBlog, getBlogById, getBlogBySlug } from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllBlog);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", validateObjectId("id"), getBlogById);

export default router;
