import express from "express";
import {
  getAllCategories,
  getCategoryById,
} from "./category.controller";
import { analyticsLogger } from "@/core/middleware/analyticsLogger";

const router = express.Router();

// ✅ Public routes
router.get("/", analyticsLogger, getAllCategories);
router.get("/:id", analyticsLogger, getCategoryById);

export default router;
