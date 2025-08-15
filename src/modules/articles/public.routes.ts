// src/modules/articles/public.articles.routes.ts
import express from "express";
import { getAllArticles, getArticlesById, getArticlesBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllArticles);
router.get("/slug/:slug", getArticlesBySlug);
router.get("/:id", validateObjectId("id"), getArticlesById);

export default router;
