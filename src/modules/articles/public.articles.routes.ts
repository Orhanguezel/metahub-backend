import express from "express";
import {
  getAllArticles,
  getArticlesById,
  getArticlesBySlug,
} from "./public.articles.controller";
import { validateObjectId } from "./articles.validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllArticles); 
router.get("/slug/:slug", getArticlesBySlug);
router.get("/:id", validateObjectId("id"), getArticlesById);

export default router;
