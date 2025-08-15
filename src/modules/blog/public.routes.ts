// src/modules/blog/public.blog.routes.ts
import express from "express";
import { getAllBlog, getBlogById, getBlogBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllBlog);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", validateObjectId("id"), getBlogById);

export default router;
