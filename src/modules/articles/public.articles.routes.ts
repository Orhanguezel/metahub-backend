// src/modules/articles/public.articles.routes.ts
import express from "express";
import {
  getAllArticles,
  getArticlesById,
  getArticlesBySlug,
} from "./public.articles.controller";
import { validateObjectId } from "./articles.validation";
import { setLocale } from "@/core/utils/i18n/setLocale";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", setLocale, getAllArticles);
router.get("/slug/:slug", setLocale, getArticlesBySlug);
router.get("/:id", validateObjectId("id"), setLocale, getArticlesById);

export default router;
