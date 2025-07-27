// src/modules/portfolio/public.portfolio.routes.ts
import express from "express";
import {
  getAllPortfolio,
  getPortfolioById,
  getPortfolioBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllPortfolio);
router.get("/slug/:slug", getPortfolioBySlug);
router.get("/:id", validateObjectId("id"), getPortfolioById);

export default router;
