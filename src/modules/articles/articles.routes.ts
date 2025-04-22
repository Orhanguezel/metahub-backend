import express from "express";
import {
  createArticle,
  getAllArticles,
  getArticleById,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
} from "./articles.controller";

import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllArticles);
router.get("/slug/:slug", getArticleBySlug);
router.get("/:id", getArticleById); // admin panel için de kullanılabilir

// 🔐 Protected Routes (admin ve moderator yetkisi gerekir)
router.post("/", authenticate, authorizeRoles("admin", "moderator"), createArticle);
router.put("/:id", authenticate, authorizeRoles("admin", "moderator"), updateArticle);
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteArticle);

export default router;
