// src/modules/massage/public.massage.routes.ts
import express from "express";
import {
  getAllMassage,
  getMassageById,
  getMassageBySlug,
} from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllMassage);
router.get("/slug/:slug", getMassageBySlug);
router.get("/:id", validateObjectId("id"), getMassageById);

export default router;
