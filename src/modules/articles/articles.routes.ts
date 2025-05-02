import express from "express";
import {
  createArticle,
  getAllArticles,
  getArticleById,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
} from "./articles.controller";

import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  validateCreateArticle,
  validateUpdateArticle,
  validateArticleId,
} from "./articles.validation";

const router = express.Router();

// 🌐 Public Routes
router.get("/", getAllArticles);
router.get("/slug/:slug", getArticleBySlug);
router.get("/:id", validateArticleId, getArticleById);

// 🔐 Protected Routes 
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "moderator"),
  validateCreateArticle,
  createArticle
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "moderator"),
  validateArticleId,
  validateUpdateArticle,
  updateArticle
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateArticleId,
  deleteArticle
);

export default router;
