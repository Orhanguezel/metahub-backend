// src/modules/news/public.news.routes.ts
import express from "express";
import { getAllNews, getNewsById, getNewsBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllNews);
router.get("/slug/:slug", getNewsBySlug);
router.get("/:id", validateObjectId("id"), getNewsById);

export default router;
