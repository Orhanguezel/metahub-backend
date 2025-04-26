// src/modules/news/admin.news.routes.ts
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { adminGetAllNews, adminGetNewsById } from "./admin.news.controller";
import { validateObjectId } from "./news.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", adminGetAllNews); // List all news
router.get("/:id", validateObjectId("id"), adminGetNewsById); // Get single news by ID

export default router;
