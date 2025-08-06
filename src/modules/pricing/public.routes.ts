// src/modules/pricing/public.pricing.routes.ts
import express from "express";
import {
  getAllPricing,
  getPricingById,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllPricing);
router.get("/:id", validateObjectId("id"), getPricingById);

export default router;
