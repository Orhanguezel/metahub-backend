// src/modules/news/public.news.routes.ts
import express from "express";
import { getAllNews, getNewsById, getNewsBySlug } from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllNews);
router.get("/slug/:slug", getNewsBySlug);
router.get("/:id", validateObjectId("id"), getNewsById);

export default router;
